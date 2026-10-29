import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ParentsService, StudentsService } from '../../core/supabase/domain-services';
import { PageHero } from '../../shared/page-hero/page-hero';

interface StudentOption { readonly id: string; readonly full_name: string; readonly student_code: string; }

@Component({
  selector: 'app-parent-form-page',
  imports: [ReactiveFormsModule, PageHero],
  templateUrl: './parent-form-page.html',
  styleUrl: './parent-form-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly parents = inject(ParentsService);
  private readonly studentsApi = inject(StudentsService);
  protected readonly editing = signal(false);
  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly students = signal<readonly StudentOption[]>([]);
  private parentId = '';
  private photo: File | null = null;

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    relation: ['Father', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    whatsapp: ['', [Validators.required, Validators.pattern(/^(?:[6-9]\d{9}|\+[1-9]\d{7,14})$/)]],
    email: ['', Validators.email],
    occupation: [''],
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['Maharashtra', Validators.required],
    pinCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    studentId: [''],
    isPrimary: [true],
    communication: ['WhatsApp', Validators.required],
  });

  async ngOnInit(): Promise<void> {
    this.parentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.editing.set(Boolean(this.parentId));
    this.loading.set(true);
    try {
      const list = await this.studentsApi.list('', 0, 499);
      this.students.set((list.data ?? []) as StudentOption[]);
      if (!this.parentId) return;
      const parent = await this.parents.getById(this.parentId);
      const [firstName, ...lastName] = String(parent.full_name).trim().split(/\s+/);
      const address = (parent.address ?? {}) as Record<string, string>;
      const preferences = (parent.communication_preferences ?? {}) as Record<string, string>;
      const link = parent.student_parents?.[0];
      this.form.patchValue({
        firstName,
        lastName: lastName.join(' '),
        relation: parent.relation ?? 'Guardian',
        phone: parent.phone ?? '',
        whatsapp: parent.whatsapp ?? parent.phone ?? '',
        email: parent.email ?? '',
        occupation: parent.occupation ?? '',
        address: address['formatted'] ?? address['address'] ?? '',
        city: address['city'] ?? '',
        state: address['state'] ?? 'Maharashtra',
        pinCode: address['pinCode'] ?? address['pin_code'] ?? '',
        studentId: link?.student?.id ?? '',
        isPrimary: link?.is_primary ?? true,
        communication: preferences['channel'] ?? 'WhatsApp',
      });
      this.photoUrl.set(parent.photo_url);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Parent could not be loaded.');
    } finally { this.loading.set(false); }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      this.message.set('Complete all required fields correctly.');
      return;
    }
    this.loading.set(true);
    this.message.set('');
    try {
      const value = this.form.getRawValue();
    const existingParent = this.editing() ? await this.parents.getById(this.parentId) : null;
    const payload = {
        full_name: `${value.firstName} ${value.lastName}`.trim(),
        relation: value.relation,
        phone: value.phone,
        whatsapp: value.whatsapp || existingParent?.whatsapp || '',
        email: value.email || null,
        occupation: value.occupation || null,
        address: { formatted: value.address, city: value.city, state: value.state, pinCode: value.pinCode },
        ...(existingParent?.address && { address: { ...existingParent.address, formatted: value.address, city: value.city, state: value.state, pinCode: value.pinCode } }),
        communication_preferences: { ...existingParent?.communication_preferences, channel: value.communication ?? existingParent?.communication_preferences?.channel ?? 'WhatsApp' },
        // Preserve existing consent/status/metadata on edit
        status: this.editing() ? existingParent?.status ?? 'active' : 'active',
      };
      const saved = this.editing()
        ? await this.parents.update(this.parentId, payload, this.photo)
        : await this.parents.create(payload, this.photo);
      if (value.studentId) await this.parents.link(value.studentId, saved.id, value.isPrimary);
      await this.router.navigate(['/parents', saved.id], {
        state: { success: this.editing() ? 'Parent updated successfully.' : 'Parent created successfully.' },
      });
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Parent could not be saved.');
    } finally { this.loading.set(false); }
  }

  protected selectPhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { this.message.set('Parent photo must be 2MB or smaller.'); return; }
    this.photo = file;
    const reader = new FileReader();
    reader.onload = () => this.photoUrl.set(String(reader.result));
    reader.readAsDataURL(file);
  }
  protected cancel(): void { void this.router.navigateByUrl('/parents'); }
  protected breadcrumb(label: string): void {
    if (label === 'Dashboard') void this.router.navigateByUrl('/dashboard');
    if (label === 'Parents') void this.router.navigateByUrl('/parents');
  }
}
