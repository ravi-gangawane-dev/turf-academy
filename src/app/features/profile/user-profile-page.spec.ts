import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { StaffRole } from '../../core/auth/auth.model';
import { AuthService } from '../../core/auth/auth.service';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { ParentDetailRecord, ParentsService } from '../../core/supabase/domain-services';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { StorageService } from '../../core/supabase/storage.service';
import { CoachPortalService } from '../coach/coach-portal.service';
import { UserProfilePage } from './user-profile-page';

const profile = {
  id: 'user-1',
  fullName: 'Taylor User',
  email: 'taylor@example.com',
  phone: '9876543210',
  role: 'admin' as StaffRole,
  status: 'active' as const,
};

function setup(role: StaffRole, status = 'active'): ComponentFixture<UserProfilePage> {
  const accountState = signal({ ...profile, role, status });
  let personalFields = {
    date_of_birth: '1988-07-12' as string | null,
    qualification: 'First Aid' as string | null,
  };
  let parent = {
    id: 'parent-1',
    profile_id: accountState().id,
    full_name: accountState().fullName,
    relation: 'Guardian',
    phone: accountState().phone,
    whatsapp: '9123456789',
    email: accountState().email,
    occupation: 'Coach',
    address: {
      line1: '12 Academy Road',
      line2: 'Unit 4',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411001',
    },
    communication_preferences: {},
    status: 'active',
    photo_path: null,
    photo_url: null,
    profile: personalFields,
    created_at: '2024-01-15T00:00:00.000Z',
    student_parents: [],
  } as unknown as ParentDetailRecord;
  let coach: Record<string, unknown> & { id: string; full_name: string; phone: string } = {
    id: 'coach-1',
    full_name: accountState().fullName,
    phone: accountState().phone,
    email: accountState().email,
    address: { line1: '10 Coach Road', city: 'Pune', state: 'Maharashtra', pinCode: '411001' },
    employee_code: 'C-100',
    date_of_birth: '1990-05-10',
    experience_years: 4,
    qualification: 'Level 2',
    biography: 'Coach biography',
    coach_specializations: [{ specialization: 'Batting' }],
    created_at: '2024-02-20T00:00:00.000Z',
  };
  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockImplementation(async () => ({
            data: {
              ...accountState(),
              full_name: accountState().fullName,
              ...personalFields,
              address: { line1: '10 Staff Road', city: 'Pune', state: 'Maharashtra', pinCode: '411001' },
              avatar_path: null,
              created_at: '2024-03-01T00:00:00.000Z',
            },
            error: null,
          })),
        })),
      })),
    })),
    rpc: vi.fn().mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === 'profile_update_own_details') {
        accountState.update((value) => ({
          ...value,
          fullName: String(args['p_full_name']),
          phone: String(args['p_phone'] ?? ''),
        }));
        personalFields = {
          date_of_birth: args['p_date_of_birth'] == null ? null : String(args['p_date_of_birth']),
          qualification: args['p_qualification'] == null ? null : String(args['p_qualification']),
        };
        return { data: { ...accountState(), full_name: accountState().fullName }, error: null };
      }
      return { data: { id: accountState().id, avatar_path: 'stored-path' }, error: null };
    }),
  };
  TestBed.configureTestingModule({
    imports: [UserProfilePage],
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          role: () => role,
          profile: () => accountState(),
          profileImageUrl: signal(null),
          setProfileImageUrl: vi.fn(),
          updateCurrentProfile: vi.fn((value) => accountState.update((current) => ({ ...current, ...value }))),
          changePassword: vi.fn(),
        },
      },
      { provide: SupabaseClientService, useValue: { requireClient: () => supabase } },
      {
        provide: StorageService,
        useValue: {
          upload: vi.fn().mockResolvedValue('stored-path'),
          signedUrl: vi.fn().mockResolvedValue('staff-photo-url'),
          remove: vi.fn().mockResolvedValue(undefined),
        },
      },
      {
        provide: AcademyPreferencesService,
        useValue: {
          value: signal({ academy_name: 'API Academy', address: { line1: 'Academy location', city: 'Pune', state: 'Maharashtra', pinCode: '411001' } }),
          load: vi.fn().mockResolvedValue(undefined),
        },
      },
      {
        provide: ParentsService,
        useValue: {
          getByProfile: vi.fn(async () => parent),
          updateOwnProfile: vi.fn(async (value, photo, fields) => {
            parent = {
              ...parent,
              ...value,
              photo_url: photo ? 'parent-photo-url' : parent.photo_url,
            } as ParentDetailRecord;
            if (fields) {
              personalFields = {
                date_of_birth: fields.dateOfBirth,
                qualification: fields.qualification,
              };
              parent = { ...parent, profile: personalFields } as ParentDetailRecord;
            }
          }),
        },
      },
      {
        provide: CoachPortalService,
        useValue: {
          load: vi.fn(async () => ({ coach })),
          updateOwnProfilePhoto: vi.fn(async (_id: string, _phone: string, _photo: File) => {
            coach = { ...coach, photo_url: 'coach-photo-url' };
            return 'coach-photo-url';
          }),
          updateFullOwnProfile: vi.fn(async (_id: string, value: Record<string, unknown>) => {
            coach = {
              ...coach,
              full_name: String(value['fullName']),
              phone: String(value['phone']),
              email: value['email'] as string | null,
              date_of_birth: value['dateOfBirth'] as string | null,
              experience_years: Number(value['experienceYears']),
              qualification: value['qualification'] as string | null,
              biography: value['biography'] as string | null,
              coach_specializations: (value['specializations'] as string[]).map((specialization) => ({ specialization })),
            };
            personalFields = {
              date_of_birth: value['dateOfBirth'] as string | null,
              qualification: value['qualification'] as string | null,
            };
            return null;
          }),
        },
      },
    ],
  });
  return TestBed.createComponent(UserProfilePage);
}

describe('UserProfilePage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('uses the shared hero and card layout for the full-width profile structure', async () => {
    const fixture = setup('admin');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-page-hero')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.identity-card .avatar-trigger')).not.toBeNull();
    const identityCard = fixture.nativeElement.querySelector('.profile-layout > app-ui-card.identity-card');
    const detailsCard = fixture.nativeElement.querySelector('.profile-layout > app-ui-card.details-card');
    expect(identityCard.classList).toContain('fill-height-host');
    expect(detailsCard.classList).toContain('fill-height-host');
    expect(fixture.nativeElement.querySelector('.section-heading .primary-button')?.textContent).toContain('Edit profile');
  });

  it.each(['active', 'inactive', 'pending'])('shows %s account status in the identity card corner', async (status) => {
    const fixture = setup('admin', status);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.account-status') as HTMLElement;
    expect(badge.getAttribute('data-status')).toBe(status);
    expect(badge.getAttribute('aria-label')).toBe(`Account status: ${status[0].toUpperCase()}${status.slice(1)}`);
    expect(badge.textContent).toContain(`${status[0].toUpperCase()}${status.slice(1)}`);
  });

  it.each([
    { role: 'admin' as StaffRole, tabs: ['Personal details', 'Security', 'Notifications', 'Preferences', 'Activity'] },
    { role: 'receptionist' as StaffRole, tabs: ['Personal details', 'Change password', 'Notifications', 'Preferences'] },
    { role: 'coach' as StaffRole, tabs: ['Personal details', 'Availability', 'Preferences'] },
    { role: 'parent' as StaffRole, tabs: ['Personal details', 'Children', 'Payments', 'Attendance', 'Communications'] },
  ])('shows the shared profile tabs for $role accounts', async ({ role, tabs }) => {
    const fixture = setup(role);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.componentInstance as unknown as { error(): string; loading(): boolean }).error()).toBe('');
    expect((fixture.componentInstance as unknown as { loading(): boolean }).loading()).toBe(false);
    const tabLabels = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLElement>)
      .map((tab) => tab.textContent?.trim());
    expect(tabLabels).toEqual(expect.arrayContaining(tabs));
    const contactRows = Array.from(fixture.nativeElement.querySelectorAll('.identity-contact .contact-row') as NodeListOf<HTMLElement>);
    const phoneIndex = contactRows.findIndex((row) => row.querySelector('.pi-phone'));
    const locationIndex = contactRows.findIndex((row) => row.querySelector('.pi-map-marker'));
    expect(locationIndex).toBeGreaterThan(phoneIndex);
    expect(contactRows[locationIndex].textContent).toContain(role === 'parent' ? '12 Academy Road' : 'Academy location');
  });

  it.each([
    { role: 'admin' as StaffRole, roleFields: [] },
    { role: 'receptionist' as StaffRole, roleFields: [] },
    { role: 'coach' as StaffRole, roleFields: ['Employee Code', 'Years of Experience', 'Specializations', 'About'] },
    { role: 'parent' as StaffRole, roleFields: ['Relationship', 'Occupation', 'Preferred Communication', 'Preferred Contact Time'] },
  ])('renders Personal Details in the required section and field order for $role', async ({ role, roleFields }) => {
    const fixture = setup(role);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const sections = Array.from(fixture.nativeElement.querySelectorAll('.personal-detail-section') as NodeListOf<HTMLElement>);
    expect(sections.map((section) => section.getAttribute('aria-label'))).toEqual([
      'Basic Information',
      'Address Information',
      'Role-Specific Information',
    ]);
    const fields = sections.map((section) =>
      Array.from(section.querySelectorAll(
        section.getAttribute('aria-label') === 'Address Information'
          ? '.address-detail > span'
          : '.detail > span',
      ) as NodeListOf<HTMLElement>)
        .map((field) => field.textContent?.trim()),
    );
    expect(fields[0]).toEqual([
      'Full Name',
      'Role',
      'Email Address',
      role === 'parent' ? 'Mobile Number (Preferred WhatsApp Number)' : 'Mobile Number',
      'Account Status',
      'Joined Date',
      'Date of Birth',
      'Qualification',
    ]);
    expect(fields[1]).toEqual(['Address Line 1', 'Address Line 2', 'City', 'State', 'PIN Code']);
    expect(fields[2]).toEqual(roleFields);
    expect(sections[1].textContent).toContain(role === 'parent' ? 'Unit 4' : '—');
    expect(sections[2].textContent).toContain(roleFields.length ? roleFields[0] : 'No additional role-specific details');

    (fixture.nativeElement.querySelector('.section-heading .primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const editSections = Array.from(fixture.nativeElement.querySelectorAll('.personal-edit-section') as NodeListOf<HTMLElement>);
    expect(editSections.map((section) => section.getAttribute('aria-label'))).toEqual([
      'Basic Information',
      'Address Information',
      'Role-Specific Information',
    ]);
    const editFields = editSections.map((section) =>
      Array.from(section.querySelectorAll('.field > span, .address-field > span') as NodeListOf<HTMLElement>)
        .map((field) => field.textContent?.trim().replace(/\s*\*$/, '')),
    );
    expect(editFields[0]).toEqual([
      'Full Name',
      'Role',
      'Email Address',
      role === 'parent' ? 'Mobile Number (Preferred WhatsApp Number)' : 'Mobile Number',
      'Account Status',
      'Joined Date',
      'Date of Birth',
      'Qualification',
    ]);
    expect(editFields[1]).toEqual(['Address Line 1', 'Address Line 2', 'City', 'State', 'PIN Code']);
    expect(editFields[2]).toEqual(role === 'parent'
      ? ['Relationship', 'Occupation', 'Preferred Communication', 'Preferred Contact Time']
      : role === 'coach'
        ? ['Employee Code', 'Years of Experience', 'Specializations', 'About You']
        : []);
    const basicFieldSlots = Array.from(editSections[0].querySelectorAll('.form-grid > .field') as NodeListOf<HTMLElement>);
    expect(basicFieldSlots).toHaveLength(8);
    expect(basicFieldSlots.every((field) => field.querySelector('input, .readonly-field'))).toBe(true);
  });

  it('prepopulates and saves Parent address line 2 without dropping existing address data', async () => {
    const fixture = setup('parent');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.section-heading .primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const page = fixture.componentInstance as unknown as {
      form: { controls: { address: { controls: { line2: { value: string; setValue(value: string): void } } } } };
      saveProfile(): Promise<boolean>;
    };
    expect(page.form.controls.address.controls.line2.value).toBe('Unit 4');
    page.form.controls.address.controls.line2.setValue('Suite 8');
    expect(await page.saveProfile()).toBe(true);
    fixture.detectChanges();

    const address = (TestBed.inject(ParentsService).updateOwnProfile as ReturnType<typeof vi.fn>).mock.calls[0][0].address;
    expect(address).toMatchObject({
      line1: '12 Academy Road',
      line2: 'Suite 8',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411001',
    });
    const addressSection = fixture.nativeElement.querySelectorAll('.personal-detail-section')[1] as HTMLElement;
    expect(addressSection.textContent).toContain('Suite 8');
    expect(addressSection.textContent).toContain('Pune');
  });

  it.each(['admin', 'receptionist', 'coach', 'parent'] as const)(
    'supports the view, edit, save and refresh flow for %s',
    async (role) => {
      const fixture = setup(role);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const editButton = fixture.nativeElement.querySelector('.section-heading .primary-button') as HTMLButtonElement;
      expect(editButton).not.toBeNull();
      editButton.click();
      fixture.detectChanges();

      const page = fixture.componentInstance as unknown as {
        form: {
          controls: {
            fullName: { value: string; setValue(value: string): void };
            phone: { value: string; setValue(value: string): void };
            relation: { value: string; setValue(value: string): void };
            qualification: { value: string; setValue(value: string): void; invalid: boolean };
            dateOfBirth: { value: string; setValue(value: string): void; invalid: boolean };
            specializations: { value: string; setValue(value: string): void };
          };
        };
        saveProfile(): Promise<boolean>;
        isEditing(): boolean;
      };
      expect(page.form.controls.fullName.value).toBe('Taylor User');
      expect(page.form.controls.phone.value).toBe('9876543210');
      expect(page.form.controls.dateOfBirth.value).toBe(role === 'coach' ? '1990-05-10' : '1988-07-12');
      expect(page.form.controls.qualification.value).toBe(role === 'coach' ? 'Level 2' : 'First Aid');
      expect(fixture.nativeElement.querySelector('.readonly-field').textContent).toContain(
        role === 'admin' ? 'Administrator' : role === 'receptionist' ? 'Receptionist' : role === 'coach' ? 'Coach' : 'Parent',
      );
      if (role === 'admin' || role === 'receptionist') {
        expect(fixture.nativeElement.querySelector('input[formControlName="email"]')).toBeNull();
      } else {
        expect(fixture.nativeElement.querySelector('input[formControlName="email"]')).not.toBeNull();
      }
      expect(fixture.nativeElement.querySelector('input[formControlName="role"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('input[formControlName="status"]')).toBeNull();
      if (role === 'coach') {
        expect(page.form.controls.fullName.value).toBe('Taylor User');
        expect(fixture.nativeElement.textContent).toContain('C-100');
        expect(fixture.nativeElement.querySelector('.field input[formControlName="employeeCode"]')).toBeNull();
      }
      if (role === 'parent') expect(page.form.controls.relation.value).toBe('Guardian');

      page.form.controls.fullName.setValue('Updated User');
      page.form.controls.phone.setValue('9000000000');
      page.form.controls.dateOfBirth.setValue('');
      page.form.controls.qualification.setValue('');
      expect(page.form.controls.dateOfBirth.invalid).toBe(false);
      expect(page.form.controls.qualification.invalid).toBe(false);
      page.form.controls.dateOfBirth.setValue(`${new Date().getFullYear() + 1}-01-01`);
      expect(page.form.controls.dateOfBirth.invalid).toBe(true);
      page.form.controls.dateOfBirth.setValue('1991-04-20');
      page.form.controls.qualification.setValue('Level 3');
      expect(page.form.controls.dateOfBirth.invalid).toBe(false);
      if (role === 'parent') page.form.controls.relation.setValue('Mother');
      if (role === 'coach') {
        page.form.controls.specializations.setValue('Bowling');
      }
      expect(await page.saveProfile()).toBe(true);
      fixture.detectChanges();

      expect(page.isEditing()).toBe(false);
      expect(fixture.nativeElement.querySelector('.personal-sections').textContent).toContain('Updated User');
      expect(fixture.nativeElement.querySelector('.personal-sections').textContent).toContain('Level 3');
      expect(fixture.nativeElement.querySelector('.personal-sections').textContent).toContain('20 Apr 1991');
      if (role === 'parent') {
        expect(fixture.nativeElement.querySelector('.personal-sections').textContent).toContain('Mother');
        expect(fixture.nativeElement.querySelector('.personal-sections').textContent).toContain('12 Academy Road');
      }
      if (role === 'coach') {
        expect(fixture.nativeElement.querySelector('.personal-sections').textContent).toContain('Level 3');
        expect(fixture.nativeElement.querySelector('.personal-sections').textContent).toContain('Bowling');
      }
      if (role === 'admin' || role === 'receptionist') {
        const client = TestBed.inject(SupabaseClientService).requireClient();
        expect(client.rpc).toHaveBeenCalledWith('profile_update_own_details', {
          p_full_name: 'Updated User',
          p_phone: '9000000000',
          p_address: {
            line1: '10 Staff Road',
            line2: '',
            city: 'Pune',
            state: 'Maharashtra',
            pinCode: '411001',
          },
          p_date_of_birth: '1991-04-20',
          p_qualification: 'Level 3',
        });
      } else if (role === 'coach') {
        expect(TestBed.inject(CoachPortalService).updateFullOwnProfile).toHaveBeenCalled();
      } else {
        expect(TestBed.inject(ParentsService).updateOwnProfile).toHaveBeenCalledWith(
          expect.objectContaining({ full_name: 'Updated User' }),
          undefined,
          { dateOfBirth: '1991-04-20', qualification: 'Level 3' },
        );
      }
    },
  );

  it('keeps edits on screen after API failure and restores saved values on cancel', async () => {
    const fixture = setup('receptionist');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.section-heading .primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const page = fixture.componentInstance as unknown as {
      form: { controls: { fullName: { setValue(value: string): void } } };
      saveProfile(): Promise<boolean>;
      cancelEdit(): void;
      isEditing(): boolean;
      error(): string;
    };
    page.form.controls.fullName.setValue('Unsaved Name');
    const rpc = TestBed.inject(SupabaseClientService).requireClient().rpc as unknown as {
      mockRejectedValueOnce(error: Error): void;
    };
    rpc.mockRejectedValueOnce(new Error('Network unavailable'));

    expect(await page.saveProfile()).toBe(false);
    expect(page.isEditing()).toBe(true);
    expect(page.error()).toContain('Network unavailable');
    page.cancelEdit();
    fixture.detectChanges();
    expect(page.isEditing()).toBe(false);
    expect(fixture.nativeElement.querySelector('.details-grid').textContent).toContain('Taylor User');
    expect(fixture.nativeElement.querySelector('.details-grid').textContent).not.toContain('Unsaved Name');
  });

  it('shows coach and parent fields once in Personal Details and keeps role-only fields read only', async () => {
    const coachFixture = setup('coach');
    coachFixture.detectChanges();
    await coachFixture.whenStable();
    coachFixture.detectChanges();
    const coachDetails = coachFixture.nativeElement.querySelector('.personal-sections').textContent;
    expect(coachDetails).toContain('Employee Code');
    expect(coachDetails).toContain('C-100');
    expect(coachDetails).toContain('Qualification');
    expect(coachDetails).toContain('Level 2');
    expect(coachDetails).toContain('Specializations');
    expect(coachDetails).toContain('Batting');
    expect(coachFixture.nativeElement.querySelectorAll('[role="tab"]')).toHaveLength(3);

    coachFixture.destroy();
    TestBed.resetTestingModule();
    const parentFixture = setup('parent');
    parentFixture.detectChanges();
    await parentFixture.whenStable();
    parentFixture.detectChanges();
    const parentDetails = parentFixture.nativeElement.querySelector('.personal-sections').textContent;
    expect(parentDetails).toContain('Relationship');
    expect(parentDetails).toContain('Preferred WhatsApp Number');
    expect(parentDetails).toContain('Occupation');
    expect(parentDetails).toContain('12 Academy Road');
  });

  it('blocks invalid parent phone and coach specialization values before persistence', async () => {
    const parentFixture = setup('parent');
    parentFixture.detectChanges();
    await parentFixture.whenStable();
    parentFixture.detectChanges();
    (parentFixture.nativeElement.querySelector('.section-heading .primary-button') as HTMLButtonElement).click();
    const parentPage = parentFixture.componentInstance as unknown as {
      form: { controls: { phone: { setValue(value: string): void } } };
      saveProfile(): Promise<boolean>;
    };
    parentPage.form.controls.phone.setValue('12345');
    expect(await parentPage.saveProfile()).toBe(false);
    expect(TestBed.inject(ParentsService).updateOwnProfile).not.toHaveBeenCalled();

    parentFixture.destroy();
    TestBed.resetTestingModule();
    const coachFixture = setup('coach');
    coachFixture.detectChanges();
    await coachFixture.whenStable();
    coachFixture.detectChanges();
    (coachFixture.nativeElement.querySelector('.section-heading .primary-button') as HTMLButtonElement).click();
    const coachPage = coachFixture.componentInstance as unknown as {
      form: { controls: { specializations: { setValue(value: string): void } } };
      saveProfile(): Promise<boolean>;
    };
    coachPage.form.controls.specializations.setValue(Array.from({ length: 21 }, (_, index) => `Skill ${index}`).join(', '));
    expect(await coachPage.saveProfile()).toBe(false);
    expect(TestBed.inject(CoachPortalService).updateFullOwnProfile).not.toHaveBeenCalled();
    coachFixture.destroy();
  });

  it.each([
    { role: 'admin' as StaffRole, photoUrl: 'staff-photo-url' },
    { role: 'receptionist' as StaffRole, photoUrl: 'staff-photo-url' },
    { role: 'coach' as StaffRole, photoUrl: 'coach-photo-url' },
    { role: 'parent' as StaffRole, photoUrl: 'parent-photo-url' },
  ])('saves a profile photo for $role without requiring profile edits to be valid', async ({ role, photoUrl }) => {
    const fixture = setup(role);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const changePhotoButton = fixture.nativeElement.querySelector(
      'button[aria-label="Change profile photo"]',
    ) as HTMLButtonElement;
    expect(changePhotoButton).not.toBeNull();
    expect(changePhotoButton.disabled).toBe(false);
    const page = fixture.componentInstance as unknown as {
      form: { controls: { fullName: { setValue(value: string): void } } };
      stagePhoto(file: File): void;
      saveAvatarPhoto(): Promise<boolean>;
      avatarUrl(): string | null;
    };
    page.form.controls.fullName.setValue('');
    page.stagePhoto(new File(['photo'], 'profile-photo.jpg', { type: 'image/jpeg' }));

    await expect(page.saveAvatarPhoto()).resolves.toBe(true);
    expect(page.avatarUrl()).toBe(photoUrl);
    if (role === 'admin') {
      expect(TestBed.inject(StorageService).upload).toHaveBeenCalledWith(
        'profile-photos',
        profile.id,
        expect.any(File),
      );
      expect(TestBed.inject(SupabaseClientService).requireClient().rpc).toHaveBeenCalledWith(
        'profile_update_own_avatar',
        { p_avatar_path: 'stored-path' },
      );
    }
  });
});
