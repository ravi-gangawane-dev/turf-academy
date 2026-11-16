import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { ParentsService, ParentDetailRecord } from '../../core/supabase/domain-services';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { StorageService } from '../../core/supabase/storage.service';
import { CoachPortalService, CoachProfile } from '../coach/coach-portal.service';
import { PageHero } from '../../shared/page-hero/page-hero';
import { ProfilePhotoUpload } from '../../shared/profile-photo-upload/profile-photo-upload';
import { UiCard } from '../../shared/ui-card/ui-card';
import { Address, addressFromDatabase, addressLines, addressValue, createAddressForm } from '../../core/models/address.model';
import { AddressFields } from '../../shared/address-fields/address-fields';

interface CoachProfileDetails extends CoachProfile {
  readonly email?: string | null;
  readonly employee_code?: string;
  readonly date_of_birth?: string | null;
  readonly experience_years?: number;
  readonly qualification?: string | null;
  readonly biography?: string | null;
  readonly coach_specializations?: readonly { readonly specialization: string }[];
}
interface ProfilePersonalFields {
  readonly date_of_birth: string | null;
  readonly qualification: string | null;
}

type ProfileSection =
  | 'personal'
  | 'role'
  | 'security'
  | 'notifications'
  | 'preferences'
  | 'activity'
  | 'availability'
  | 'payments'
  | 'attendance'
  | 'communications';
interface ProfileTab {
  readonly id: ProfileSection;
  readonly label: string;
  readonly icon: string;
}
interface SectionAction {
  readonly label: string;
  readonly description: string;
  readonly route: string;
  readonly icon: string;
}
interface ProfileDetail {
  readonly label: string;
  readonly value: string;
  /** Optional action target, e.g. a mailto: or tel: link for contact details. */
  readonly href?: string;
}
interface ProfileDetailSection {
  readonly title: string;
  readonly fields: readonly ProfileDetail[];
}

const PHONE_DIGITS = /^\d{10,15}$/;

function phoneInput(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

function validSpecializations(value: unknown): boolean {
  const entries = String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  return entries.length <= 20 && entries.every((item) => item.length <= 80);
}

@Component({
  selector: 'app-user-profile-page',
  imports: [PageHero, ProfilePhotoUpload, ReactiveFormsModule, RouterLink, TitleCasePipe, UiCard, AddressFields],
  templateUrl: './user-profile-page.html',
  styleUrl: './user-profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfilePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseClientService);
  private readonly parents = inject(ParentsService);
  private readonly coaches = inject(CoachPortalService);
  private readonly academyPreferences = inject(AcademyPreferencesService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  protected readonly role = this.auth.role;
  protected readonly profile = this.auth.profile;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly selectedTab = signal<ProfileSection>('personal');
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly passwordError = signal('');
  protected readonly passwordSuccess = signal('');
  protected readonly avatarUrl = signal<string | null>(null);
  protected readonly locationLoadError = signal(false);
  protected readonly academyName = computed(() => this.academyPreferences.value().academy_name);
  protected readonly parentRecord = signal<ParentDetailRecord | null>(null);
  protected readonly coachRecord = signal<CoachProfileDetails | null>(null);
  protected readonly staffRecord = signal<Record<string, unknown> | null>(null);
  protected readonly personalFields = signal<ProfilePersonalFields | null>(null);
  private photo: File | null = null;
  protected readonly saveAvatarPhotoAction = (): Promise<boolean> => this.saveAvatarPhoto();

  protected readonly tabs = computed<readonly ProfileTab[]>(() => {
    const role = this.role();
    const personal = { id: 'personal' as const, label: 'Personal details', icon: 'pi pi-user' };
    if (role === 'admin') return [
      personal,
      { id: 'security', label: 'Security', icon: 'pi pi-shield' },
      { id: 'notifications', label: 'Notifications', icon: 'pi pi-bell' },
      { id: 'preferences', label: 'Preferences', icon: 'pi pi-sliders-h' },
      { id: 'activity', label: 'Activity', icon: 'pi pi-history' },
    ];
    if (role === 'receptionist') return [
      personal,
      { id: 'security', label: 'Change password', icon: 'pi pi-shield' },
      { id: 'notifications', label: 'Notifications', icon: 'pi pi-bell' },
      { id: 'preferences', label: 'Preferences', icon: 'pi pi-sliders-h' },
    ];
    if (role === 'coach') return [
      personal,
      { id: 'availability', label: 'Availability', icon: 'pi pi-calendar' },
      { id: 'preferences', label: 'Preferences', icon: 'pi pi-sliders-h' },
    ];
    return [
      personal,
      { id: 'role', label: 'Children', icon: 'pi pi-users' },
      { id: 'payments', label: 'Payments', icon: 'pi pi-wallet' },
      { id: 'attendance', label: 'Attendance', icon: 'pi pi-calendar-clock' },
      { id: 'communications', label: 'Communications', icon: 'pi pi-comments' },
    ];
  });
  protected readonly breadcrumbs = computed(() => [
    {
      label: 'Home',
      icon: 'pi-home',
      route: this.role() === 'parent' ? '/parent/dashboard' : this.role() === 'coach' ? '/coach/dashboard' : '/dashboard',
    },
    { label: 'My Profile' },
  ]);
  protected readonly joinedDate = computed(() => {
    const raw = this.parentRecord()?.created_at ?? this.coachRecord()?.['created_at'] ?? this.staffRecord()?.['created_at'];
    if (!raw) return null;
    const date = new Date(String(raw));
    return Number.isNaN(date.getTime())
      ? null
      : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  });
  protected readonly dateOfBirth = computed(() => {
    const raw = this.coachRecord()?.['date_of_birth']
      ?? this.parentRecord()?.profile?.date_of_birth
      ?? this.personalFields()?.date_of_birth;
    if (typeof raw !== 'string' || !raw) return '—';
    const date = new Date(`${raw.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? '—'
      : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  });
  protected readonly qualification = computed(() => {
    const value = this.coachRecord()?.['qualification']
      ?? this.parentRecord()?.profile?.qualification
      ?? this.personalFields()?.qualification;
    return typeof value === 'string' && value.trim() ? value.trim() : '—';
  });
  protected readonly profileAddress = computed<Address>(() => {
    if (this.role() === 'parent') return this.parentRecord()?.address ?? addressFromDatabase(null);
    if (this.role() === 'coach') return this.coachRecord()?.address ?? addressFromDatabase(null);
    return addressFromDatabase(this.staffRecord()?.['address']);
  });
  protected readonly mobileLabel = computed(() =>
    this.role() === 'parent' ? 'Mobile Number (Preferred WhatsApp Number)' : 'Mobile Number',
  );
  protected readonly mobileValue = computed(() => {
    const phone = this.profile()?.phone?.trim() || '';
    const whatsapp = this.parentRecord()?.whatsapp?.trim() || '';
    if (this.role() !== 'parent' || !whatsapp || whatsapp === phone) return phone || whatsapp || '—';
    return `${phone || '—'} (WhatsApp: ${whatsapp})`;
  });
  /** One-line address for the identity card; the full value stays in the title. */
  protected readonly location = computed(
    () => addressLines(this.profileAddress()).join(', ') || 'Location not provided',
  );
  protected readonly activeTabLabel = computed(() =>
    this.tabs().find((tab) => tab.id === this.selectedTab())?.label ?? '',
  );
  protected readonly roleLabel = computed(() => ({
    admin: 'Administrator',
    receptionist: 'Receptionist',
    coach: 'Coach',
    parent: 'Parent',
  })[this.role() ?? 'admin']);
  protected readonly contactEmail = computed(() =>
    this.parentRecord()?.email
    ?? this.coachRecord()?.email
    ?? (this.staffRecord()?.['email'] ? String(this.staffRecord()?.['email']) : undefined)
    ?? this.profile()?.email,
  );
  protected readonly initials = computed(() => {
    const name = this.profile()?.fullName ?? '';
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'U';
  });
  protected readonly children = computed(() =>
    this.parentRecord()?.student_parents
      .map((link) => ({ ...link.student, isPrimary: link.is_primary, canPickUp: link.can_pick_up }))
      .filter((child) => child !== null) ?? [],
  );
  protected readonly specializations = computed(() =>
    this.coachRecord()?.coach_specializations?.map((item) => item.specialization) ?? [],
  );
  protected readonly experienceLabel = computed(() => {
    const years = this.coachRecord()?.['experience_years'];
    return years == null ? '—' : `${years} years`;
  });
  /** Groups an Indian number for reading: 9130451715 → +91 91304 51715. */
  protected friendlyPhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    return value;
  }

  private phoneHref(value: string): string | undefined {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `tel:+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `tel:+${digits}`;
    return undefined;
  }

  protected readonly personalDetailSections = computed<readonly ProfileDetailSection[]>(() => {
    const role = this.role();
    const status = this.profile()?.status;
    const parent = this.parentRecord();
    const coach = this.coachRecord();
    const coachSpecializations = this.specializations().join(', ');
    const email = this.contactEmail()?.trim() ?? '';
    const roleFields: ProfileDetail[] = role === 'parent'
      ? [
        { label: 'Relationship', value: parent?.relation || '—' },
        { label: 'Occupation', value: parent?.occupation || '—' },
        { label: 'Preferred Communication', value: parent?.communication_preferences?.channel || '—' },
        { label: 'Preferred Contact Time', value: parent?.communication_preferences?.contactTime || '—' },
      ]
      : role === 'coach'
        ? [
          { label: 'Employee Code', value: String(coach?.['employee_code'] ?? '').trim() || '—' },
          { label: 'Years of Experience', value: this.experienceLabel() },
          { label: 'Specializations', value: coachSpecializations || '—' },
          { label: 'About', value: String(coach?.['biography'] ?? '').trim() || '—' },
        ]
        : [];
    return [
      {
        title: 'Basic Information',
        fields: [
          { label: 'Full Name', value: this.profile()?.fullName?.trim() || '—' },
          { label: 'Role', value: this.roleLabel() },
          { label: 'Email Address', value: email || '—', href: email ? `mailto:${email}` : undefined },
          { label: this.mobileLabel(), value: this.friendlyPhone(this.mobileValue()), href: this.phoneHref(this.mobileValue()) },
          { label: 'Account Status', value: status ? status[0].toUpperCase() + status.slice(1) : '—' },
          { label: 'Joined Date', value: this.joinedDate() || '—' },
          { label: 'Date of Birth', value: this.dateOfBirth() },
          { label: 'Qualification', value: this.qualification() },
        ],
      },
      {
        title: 'Address Information',
        fields: [
          { label: 'Address Line 1', value: this.profileAddress().line1 || '—' },
          { label: 'Address Line 2', value: this.profileAddress().line2 || '—' },
          { label: 'City', value: this.profileAddress().city || '—' },
          { label: 'State', value: this.profileAddress().state || '—' },
          { label: 'PIN Code', value: this.profileAddress().pinCode || '—' },
        ],
      },
      { title: 'Role-Specific Information', fields: roleFields },
    ];
  });
  protected readonly sectionAction = computed<SectionAction | null>(() => {
    const role = this.role();
    switch (this.selectedTab()) {
      case 'notifications':
        return {
          label: 'Open notifications',
          description: 'Review updates and messages for your account.',
          route: role === 'coach' ? '/coach/notifications' : role === 'parent' ? '/parent/notifications' : '/notifications',
          icon: 'pi pi-bell',
        };
      case 'availability':
        return { label: 'Open your schedule', description: 'Review assigned training sessions and availability.', route: '/coach/schedule', icon: 'pi pi-calendar' };
      case 'payments':
        return { label: 'Open payments', description: 'Review fees, receipts and payment history for your children.', route: '/parent/payments', icon: 'pi pi-wallet' };
      case 'attendance':
        return {
          label: 'Open attendance',
          description: role === 'parent' ? 'Review attendance for your children.' : 'Open academy attendance records.',
          route: role === 'parent' ? '/parent/attendance' : '/attendance',
          icon: 'pi pi-calendar-clock',
        };
      case 'communications':
        return { label: 'Open communications', description: 'View messages and academy updates.', route: '/parent/notifications', icon: 'pi pi-comments' };
      case 'activity':
        return { label: 'Open activity log', description: 'Review recent administrative changes.', route: '/settings/audit-logs', icon: 'pi pi-history' };
      default:
        return null;
    }
  });

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_DIGITS)]],
    email: ['', Validators.email],
    relation: ['', Validators.required],
    whatsapp: [''],
    occupation: [''],
    address: createAddressForm(this.fb.nonNullable),
    dateOfBirth: ['', (control: AbstractControl) => {
      const value = String(control.value ?? '');
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return value && value > today ? { futureDate: true } : null;
    }],
    qualification: [''],
    experienceYears: [0, [Validators.required, Validators.min(0), Validators.max(60)]],
    biography: ['', Validators.maxLength(2000)],
    specializations: [''],
  });
  protected readonly passwordForm = this.fb.nonNullable.group({
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/),
    ]],
    confirmPassword: ['', Validators.required],
  });

  async ngOnInit(): Promise<void> {
    this.isEditing.set(this.router.url.startsWith('/parent/profile/edit'));
    void this.academyPreferences.load().catch(() => this.locationLoadError.set(true));
    await this.loadProfile();
  }

  protected setTab(tab: ProfileSection): void {
    this.error.set('');
    this.success.set('');
    this.selectedTab.set(tab);
  }

  protected editProfile(): void {
    this.error.set('');
    this.success.set('');
    this.populateForm();
    this.isEditing.set(true);
  }

  protected cancelEdit(): void {
    this.photo = null;
    this.error.set('');
    this.isEditing.set(false);
    this.populateForm();
    if (this.router.url.startsWith('/parent/profile/edit')) void this.router.navigateByUrl('/profile');
  }

  protected stagePhoto(file: File): void {
    this.photo = file;
  }

  protected async saveAvatarPhoto(): Promise<boolean> {
    const role = this.role();
    const profileId = this.profile()?.id;
    if (!role || !profileId || !this.photo || this.saving()) return false;

    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    try {
      let savedAvatar: string;
      if (role === 'admin' || role === 'receptionist') {
        const photoPath = await this.storage.upload('profile-photos', profileId, this.photo);
        let staff: Record<string, unknown>;
        try {
          const result = await this.supabase.requireClient().rpc('profile_update_own_avatar', {
            p_avatar_path: photoPath,
          });
          if (result.error) throw result.error;
          if (!result.data) throw new Error('Staff profile was not returned after saving the photo.');
          staff = result.data as Record<string, unknown>;
        } catch (error) {
          try {
            await this.storage.remove('profile-photos', photoPath);
          } catch (cleanupError) {
            throw new AggregateError(
              [error, cleanupError],
              'Profile photo update failed and the uploaded photo could not be removed.',
              { cause: cleanupError },
            );
          }
          throw error;
        }
        savedAvatar = await this.storage.signedUrl('profile-photos', photoPath);
        this.staffRecord.set({ ...this.staffRecord(), ...staff, avatar_path: photoPath });
      } else if (role === 'coach') {
        const coach = this.coachRecord();
        if (!coach) throw new Error('Coach profile details are unavailable.');
        savedAvatar = await this.coaches.updateOwnProfilePhoto(
          String(coach.id),
          String(coach.phone ?? ''),
          this.photo,
        );
        this.coachRecord.set({ ...coach, photo_url: savedAvatar });
      } else {
        const parent = this.parentRecord();
        if (!parent) throw new Error('Parent profile details are unavailable.');
        await this.parents.updateOwnProfile({
          full_name: parent.full_name,
          relation: parent.relation,
          phone: parent.phone,
          whatsapp: parent.whatsapp,
          email: parent.email,
          occupation: parent.occupation,
          address: parent.address,
        }, this.photo);
        const updatedParent = await this.parents.getByProfile(profileId);
        this.parentRecord.set(updatedParent);
        if (!updatedParent.photo_url) throw new Error('Parent photo was saved but could not be loaded.');
        savedAvatar = updatedParent.photo_url;
      }

      this.avatarUrl.set(savedAvatar);
      this.auth.updateCurrentProfile({ avatarUrl: savedAvatar });
      this.auth.setProfileImageUrl(savedAvatar);
      this.photo = null;
      this.success.set('Your profile photo has been updated.');
      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Your profile photo could not be updated.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveProfile(): Promise<boolean> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.error.set('Check the highlighted fields and try again.');
      return false;
    }
    const role = this.role();
    const profileId = this.profile()?.id;
    if (!role || !profileId) {
      this.error.set('Your signed-in profile is unavailable.');
      return false;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    try {
      let savedAvatar = this.avatarUrl();
      if (role === 'admin' || role === 'receptionist') {
        const result = await this.supabase.requireClient().rpc('profile_update_own_details', {
          p_full_name: value.fullName.trim(),
          p_phone: value.phone.trim() || null,
          p_address: addressValue(value.address),
          p_date_of_birth: value.dateOfBirth || null,
          p_qualification: value.qualification.trim() || null,
        });
        if (result.error) throw result.error;
        if (!result.data) throw new Error('Your profile was not returned after saving.');
      } else if (role === 'coach') {
        const coach = this.coachRecord();
        if (!coach) throw new Error('Coach profile details are unavailable.');
        const specializations = value.specializations
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        const photoUrl = await this.coaches.updateFullOwnProfile(String(coach.id), {
          fullName: value.fullName,
          phone: value.phone,
          address: addressValue(value.address),
          email: value.email || null,
          dateOfBirth: value.dateOfBirth || null,
          experienceYears: Number(value.experienceYears),
          qualification: value.qualification || null,
          biography: value.biography || null,
          specializations,
        });
        if (photoUrl) savedAvatar = photoUrl;
        this.coachRecord.set({
          ...coach,
          full_name: value.fullName,
          phone: value.phone,
          email: value.email || null,
          date_of_birth: value.dateOfBirth || null,
          experience_years: Number(value.experienceYears),
          qualification: value.qualification || null,
          biography: value.biography || null,
          coach_specializations: specializations.map((specialization) => ({ specialization })),
          photo_url: savedAvatar,
        });
      } else {
        const parent = this.parentRecord();
        if (!parent) throw new Error('Parent profile details are unavailable.');
        await this.parents.updateOwnProfile({
          full_name: value.fullName.trim(),
          relation: value.relation,
          phone: value.phone,
          whatsapp: value.whatsapp || null,
          email: value.email || null,
          occupation: value.occupation || null,
          address: addressValue(value.address),
        }, undefined, {
          dateOfBirth: value.dateOfBirth || null,
          qualification: value.qualification.trim() || null,
        });
      }

      if (savedAvatar) {
        this.avatarUrl.set(savedAvatar);
        this.auth.updateCurrentProfile({ avatarUrl: savedAvatar });
        this.auth.setProfileImageUrl(savedAvatar);
      }
      if (!await this.loadProfile()) {
        this.error.set('Your changes were saved, but the latest profile data could not be refreshed. Reload the page to verify them.');
        return false;
      }
      this.photo = null;
      this.isEditing.set(false);
      this.success.set('Your profile has been updated.');
      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Your profile could not be updated.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  protected async changePassword(): Promise<void> {
    const value = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid || value.password !== value.confirmPassword || this.changingPassword()) {
      this.passwordForm.markAllAsTouched();
      this.passwordError.set(
        value.password !== value.confirmPassword
          ? 'The passwords do not match.'
          : 'Use at least 8 characters, including a letter, number and symbol.',
      );
      return;
    }
    this.changingPassword.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set('');
    try {
      await this.auth.changePassword(value.password);
      this.passwordForm.reset();
      this.passwordSuccess.set('Your password has been changed.');
    } catch (error) {
      this.passwordError.set(error instanceof Error ? error.message : 'Your password could not be changed.');
    } finally {
      this.changingPassword.set(false);
    }
  }

  private async loadProfile(): Promise<boolean> {
    this.loading.set(true);
    this.error.set('');
    const profile = this.profile();
    const role = this.role();
    if (!profile || !role) {
      this.error.set('Your signed-in profile is unavailable.');
      this.loading.set(false);
      return false;
    }
    this.avatarUrl.set(this.auth.profileImageUrl() ?? profile.avatarUrl ?? null);
    try {
      if (role === 'parent') {
        const parent = await this.parents.getByProfile(profile.id);
        this.parentRecord.set(parent);
        this.avatarUrl.set(parent.photo_url ?? this.avatarUrl());
        this.auth.updateCurrentProfile({
          fullName: parent.full_name,
          phone: parent.phone,
          ...(parent.photo_url ? { avatarUrl: parent.photo_url } : {}),
        });
      } else if (role === 'coach') {
        const data = await this.coaches.load();
        this.coachRecord.set(data.coach as CoachProfileDetails);
        this.avatarUrl.set(data.coach.photo_url ?? this.avatarUrl());
        this.auth.updateCurrentProfile({
          fullName: data.coach.full_name,
          phone: data.coach.phone ?? undefined,
          ...(data.coach.photo_url ? { avatarUrl: data.coach.photo_url } : {}),
        });
      } else {
        const result = await this.supabase.requireClient()
          .from('profiles')
          .select('id,full_name,email,phone,role,status,avatar_url,avatar_path,created_at,address,date_of_birth,qualification')
          .eq('id', profile.id)
          .single();
        if (result.error) throw result.error;
        this.staffRecord.set(result.data);
        this.personalFields.set({
          date_of_birth: result.data.date_of_birth ? String(result.data.date_of_birth) : null,
          qualification: result.data.qualification ? String(result.data.qualification) : null,
        });
        const storedAvatar = result.data.avatar_path
          ? await this.storage.signedUrl('profile-photos', String(result.data.avatar_path))
          : result.data.avatar_url;
        this.avatarUrl.set(storedAvatar ?? this.avatarUrl());
        this.auth.updateCurrentProfile({
          fullName: String(result.data.full_name ?? profile.fullName),
          phone: result.data.phone ? String(result.data.phone) : undefined,
          ...(storedAvatar ? { avatarUrl: String(storedAvatar) } : {}),
        });
      }
      this.auth.setProfileImageUrl(this.avatarUrl());
      this.populateForm();
      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Your profile could not be loaded.');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  private populateForm(): void {
    const role = this.role();
    const parentRecord = this.parentRecord();
    const coach = this.coachRecord();
    const staff = this.staffRecord();
    const isParent = role === 'parent';
    this.form.controls.phone.setValidators(
      role === 'admin' || role === 'receptionist'
        ? Validators.pattern(PHONE_DIGITS)
        : [Validators.required, Validators.pattern(isParent ? /^\d{10}$/ : PHONE_DIGITS)],
    );
    this.form.controls.phone.updateValueAndValidity({ emitEvent: false });
    this.form.controls.email.setValidators(role === 'admin' || role === 'receptionist' ? [] : Validators.email);
    this.form.controls.email.updateValueAndValidity({ emitEvent: false });
    this.form.controls.whatsapp.setValidators(isParent ? Validators.pattern(/^\d{10}$/) : []);
    this.form.controls.whatsapp.updateValueAndValidity({ emitEvent: false });
    this.form.controls.relation.setValidators(isParent ? Validators.required : []);
    this.form.controls.relation.updateValueAndValidity({ emitEvent: false });
    this.form.controls.qualification.setValidators(Validators.maxLength(160));
    this.form.controls.qualification.updateValueAndValidity({ emitEvent: false });
    this.form.controls.specializations.setValidators((control) =>
      validSpecializations(control.value) ? null : { invalidSpecializations: true },
    );
    this.form.controls.specializations.updateValueAndValidity({ emitEvent: false });
    this.form.reset({
      fullName: String(parentRecord?.full_name ?? coach?.['full_name'] ?? staff?.['full_name'] ?? this.profile()?.fullName ?? ''),
      phone: phoneInput(parentRecord?.phone ?? coach?.['phone'] ?? staff?.['phone'] ?? this.profile()?.phone),
      email: String(parentRecord?.email ?? coach?.['email'] ?? staff?.['email'] ?? this.profile()?.email ?? ''),
      relation: String(parentRecord?.relation ?? ''),
      whatsapp: phoneInput(parentRecord?.whatsapp),
      occupation: String(parentRecord?.occupation ?? ''),
      address: addressValue(this.profileAddress()),
      dateOfBirth: String(coach?.['date_of_birth'] ?? parentRecord?.profile?.date_of_birth ?? this.personalFields()?.date_of_birth ?? ''),
      qualification: String(coach?.['qualification'] ?? parentRecord?.profile?.qualification ?? this.personalFields()?.qualification ?? ''),
      experienceYears: Number(coach?.['experience_years'] ?? 0),
      biography: String(coach?.['biography'] ?? ''),
      specializations: (coach?.['coach_specializations'] ?? [])
        .map((item) => item.specialization).join(', '),
    });
  }
}
