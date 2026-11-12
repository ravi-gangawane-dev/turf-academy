import { PageHero } from '../../shared/page-hero/page-hero';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ParentsService } from '../../core/supabase/domain-services';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const FIELD_LABELS: Record<string, string> = {
  firstName: 'first name',
  lastName: 'last name',
  relation: 'relationship',
  phone: 'phone number (10 digits)',
  whatsapp: 'WhatsApp number (10 digits)',
  email: 'email address',
  address: 'address',
  city: 'city',
  state: 'state',
  pinCode: 'PIN code (6 digits)',
};

/** Keeps stored numbers that carry a country code (+91 / leading 0) editable in a 10-digit field. */
export function nationalPhone(value: string | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length <= 10) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.slice(-10);
}

@Component({
  selector: 'app-parent-profile-form-page',
  imports: [PageHero, ReactiveFormsModule],
  templateUrl: './parent-profile-form-page.html',
  styleUrl: './parent-profile-form-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentProfileFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly parents = inject(ParentsService);
  private readonly router = inject(Router);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly photoUrl = signal<string | null>(null);
  private photo: File | null = null;
  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    relation: ['Guardian', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    whatsapp: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', Validators.email],
    occupation: [''],
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['Maharashtra', Validators.required],
    pinCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  async ngOnInit() {
    const profileId = this.auth.profile()?.id;
    if (!profileId) {
      this.error.set('Parent account is unavailable.');
      this.loading.set(false);
      return;
    }
    try {
      const parent = await this.parents.getByProfile(profileId);
      const [firstName, ...lastName] = String(parent.full_name).split(/\s+/),
        address = parent.address ?? {};
      this.form.patchValue({
        firstName,
        lastName: lastName.join(' '),
        relation: parent.relation ?? 'Guardian',
        phone: nationalPhone(parent.phone),
        whatsapp: nationalPhone(parent.whatsapp ?? parent.phone),
        email: parent.email ?? '',
        occupation: parent.occupation ?? '',
        address: address.formatted ?? address.address ?? '',
        city: address.city ?? '',
        state: address.state ?? 'Maharashtra',
        pinCode: address.pinCode ?? address.pin_code ?? '',
      });
      this.photoUrl.set(parent.photo_url);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Profile could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
  protected choosePhoto(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      this.error.set('Profile photo must be a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.error.set('Profile photo must be 2 MB or smaller.');
      return;
    }
    this.error.set('');
    this.photo = file;
    const reader = new FileReader();
    reader.onload = () => this.photoUrl.set(String(reader.result));
    reader.readAsDataURL(file);
  }
  protected async save() {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      const invalid = Object.entries(FIELD_LABELS)
        .filter(([control]) => this.form.get(control)?.invalid)
        .map(([, label]) => label);
      this.error.set(
        invalid.length
          ? `Complete these required fields: ${invalid.join(', ')}.`
          : 'Complete all required fields correctly.',
      );
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const v = this.form.getRawValue();
      await this.parents.updateOwnProfile(
        {
          full_name: `${v.firstName} ${v.lastName}`.trim(),
          relation: v.relation,
          phone: v.phone,
          whatsapp: v.whatsapp,
          email: v.email || null,
          occupation: v.occupation || null,
          address: { formatted: v.address, city: v.city, state: v.state, pinCode: v.pinCode },
        },
        this.photo,
      );
      await this.router.navigateByUrl('/parent/profile');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Profile could not be updated.');
    } finally {
      this.saving.set(false);
    }
  }
  protected cancel() {
    void this.router.navigateByUrl('/parent/profile');
  }
}
