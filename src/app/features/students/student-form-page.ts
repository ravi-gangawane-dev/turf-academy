import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHero } from '../../shared/page-hero/page-hero';
import { StudentListFilters, StudentListService } from './student-list.service';

@Component({
  selector: 'app-student-form-page',
  imports: [ReactiveFormsModule, PageHero],
  templateUrl: './student-form-page.html',
  styleUrl: './student-form-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly students = inject(StudentListService);
  protected readonly editing = signal(false);
  protected readonly parentChildEdit = signal(false);
  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly filters = signal<StudentListFilters>({ batches: [], programs: [], coaches: [] });
  private studentId = '';
  private selectedPhoto: File | null = null;
  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    dateOfBirth: ['', Validators.required],
    gender: ['Male', Validators.required],
    bloodGroup: [''],
    mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', Validators.email],
    nationality: ['Indian'],
    aadhaar: [''],
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['Maharashtra', Validators.required],
    pinCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    skillLevel: ['Beginner', Validators.required],
    program: ['', Validators.required],
    coach: [''],
    joiningDate: ['', Validators.required],
    parentName: ['', [Validators.required, Validators.minLength(2)]],
    relation: ['Father', Validators.required],
    whatsapp: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    guardianEmail: ['', Validators.email],
  });
  async ngOnInit(): Promise<void> {
    try {
      this.filters.set(await this.students.filters());
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Student form options could not be loaded.');
    }
    this.parentChildEdit.set(this.route.snapshot.data['parentChildEdit'] === true);
    this.studentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.editing.set(Boolean(this.studentId));
    if (!this.studentId) return;
    if (this.parentChildEdit()) {
      this.form.controls.program.clearValidators();
      this.form.controls.parentName.clearValidators();
      this.form.controls.relation.clearValidators();
      this.form.controls.whatsapp.clearValidators();
      this.form.updateValueAndValidity();
    }
    this.loading.set(true);
    try {
      const student = await this.students.getById(this.studentId);
      const [firstName, ...lastName] = student.fullName.trim().split(/\s+/);
      this.form.patchValue({
        firstName,
        lastName: lastName.join(' '),
        dateOfBirth: student.dateOfBirth,
        gender: student.gender ?? 'Male',
        mobile: student.phone ?? '',
        email: student.email ?? '',
        bloodGroup: student.bloodGroup ?? '',
        nationality: student.nationality ?? 'Indian',
        aadhaar: student.aadhaar ?? '',
        skillLevel: student.skillLevel,
        address: student.address ?? '',
        city: student.city ?? '',
        state: student.state ?? 'Maharashtra',
        pinCode: student.pinCode ?? '',
        joiningDate: student.joinedOn,
        program: student.batchId ?? '',
        coach: student.coachId ?? '',
        parentName: student.parentName ?? '',
        relation: student.parentRelation ?? 'Guardian',
        whatsapp: student.parentPhone ?? '',
        guardianEmail: student.parentEmail ?? '',
      });
      this.photoUrl.set(student.photoUrl);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Student could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set('Complete all required fields correctly.');
      return;
    }
    const { firstName, lastName, ...value } = this.form.getRawValue();
    const fullName = `${firstName} ${lastName}`.trim();
    this.loading.set(true);
    this.message.set('');
    try {
      const mutation = {
        fullName,
        dateOfBirth: value.dateOfBirth,
        gender: value.gender,
        bloodGroup: value.bloodGroup,
        phone: value.mobile,
        email: value.email,
        nationality: value.nationality,
        aadhaar: value.aadhaar,
        address: value.address,
        city: value.city,
        state: value.state,
        pinCode: value.pinCode,
        skillLevel: value.skillLevel,
        batchId: value.program,
        joinedOn: value.joiningDate,
        parentName: value.parentName,
        parentRelation: value.relation,
        parentPhone: value.whatsapp,
        parentEmail: value.guardianEmail,
        photo: this.selectedPhoto,
      };
      if (this.parentChildEdit()) {
        await this.students.updateLinkedChildProfile(this.studentId, mutation);
      } else if (this.editing()) {
        await this.students.updateStudent(this.studentId, mutation);
      } else {
        await this.students.createStudent(mutation);
      }
      await this.router.navigate(
        this.parentChildEdit() ? ['/parent/children', this.studentId] : ['/students'],
        {
          state: {
            success: this.parentChildEdit()
              ? 'Child profile updated successfully.'
              : this.editing()
                ? 'Student updated successfully.'
                : 'Student created successfully.',
          },
        },
      );
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Student could not be saved.');
    } finally {
      this.loading.set(false);
    }
  }
  protected cancel(): void {
    void this.router.navigate(
      this.parentChildEdit() ? ['/parent/children', this.studentId] : ['/students'],
    );
  }

  protected selectPhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.message.set('Student photo must be 2MB or smaller.');
      return;
    }
    this.selectedPhoto = file;
    const reader = new FileReader();
    reader.onload = () => this.photoUrl.set(String(reader.result));
    reader.readAsDataURL(file);
  }

  protected openBreadcrumb(label: string): void {
    if (label === 'Dashboard')
      void this.router.navigateByUrl(this.parentChildEdit() ? '/parent/dashboard' : '/dashboard');
    if (label === 'My Children') void this.router.navigateByUrl('/parent/children');
    if (label === 'Students' || label === 'Student List') {
      void this.router.navigateByUrl('/students');
    }
  }
}
