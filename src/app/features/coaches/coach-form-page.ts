import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachesService } from '../../core/supabase/domain-services';
import { PageHero } from '../../shared/page-hero/page-hero';

@Component({
  selector: 'app-coach-form-page',
  imports: [ReactiveFormsModule, PageHero],
  templateUrl: './coach-form-page.html',
  styleUrl: './coach-form-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coaches = inject(CoachesService);
  protected readonly editing = signal(false);
  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly photoUrl = signal<string | null>(null);
  private coachId = '';
  private photo: File | null = null;
  protected readonly form = this.fb.nonNullable.group({
    employeeCode: ['', [Validators.required, Validators.minLength(3)]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', Validators.email],
    dateOfBirth: [''],
    experienceYears: [0, [Validators.required, Validators.min(0)]],
    status: ['active', Validators.required],
    qualification: ['', Validators.required],
    primarySpecialization: ['', Validators.required],
    additionalSpecializations: [''],
    biography: [''],
  });
  async ngOnInit(): Promise<void> {
    this.coachId = this.route.snapshot.paramMap.get('id') ?? '';
    this.editing.set(Boolean(this.coachId));
    if (!this.coachId) return;
    this.loading.set(true);
    try {
      const coach = await this.coaches.getById(this.coachId);
      const [firstName, ...lastName] = coach.full_name.trim().split(/\s+/);
      const specs = coach.coach_specializations.map((row) => row.specialization);
      this.form.patchValue({
        employeeCode: coach.employee_code,
        firstName,
        lastName: lastName.join(' '),
        phone: coach.phone,
        email: coach.email ?? '',
        dateOfBirth: coach.date_of_birth ?? '',
        experienceYears: coach.experience_years ?? 0,
        status: coach.status,
        qualification: coach.qualification ?? '',
        primarySpecialization: specs[0] ?? '',
        additionalSpecializations: specs.slice(1).join(', '),
        biography: coach.biography ?? '',
      });
      this.photoUrl.set(coach.photo_url);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Coach could not be loaded.');
    } finally {
      this.loading.set(false);
    }
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
      const specializations = [
        value.primarySpecialization,
        ...value.additionalSpecializations.split(','),
      ];
      const payload = {
        employee_code: value.employeeCode.trim(),
        full_name: `${value.firstName} ${value.lastName}`.trim(),
        phone: value.phone,
        email: value.email || null,
        date_of_birth: value.dateOfBirth || null,
        experience_years: value.experienceYears,
        qualification: value.qualification,
        biography: value.biography || null,
        status: value.status,
      };
      const saved = this.editing()
        ? await this.coaches.update(this.coachId, payload, specializations, this.photo)
        : await this.coaches.create(payload, specializations, this.photo);
      await this.router.navigate(['/coaches', saved.id], {
        state: {
          success: this.editing() ? 'Coach updated successfully.' : 'Coach created successfully.',
        },
      });
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Coach could not be saved.');
    } finally {
      this.loading.set(false);
    }
  }
  protected selectPhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.message.set('Coach photo must be 2MB or smaller.');
      return;
    }
    this.photo = file;
    const reader = new FileReader();
    reader.onload = () => this.photoUrl.set(String(reader.result));
    reader.readAsDataURL(file);
  }
  protected cancel(): void {
    void this.router.navigateByUrl('/coaches');
  }
  protected breadcrumb(label: string): void {
    if (label === 'Dashboard') void this.router.navigateByUrl('/dashboard');
    if (label === 'Coaches') this.cancel();
  }
}
