import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHero } from '../../shared/page-hero/page-hero';
import { ToastService } from '../../shared/toast/toast.service';
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
  private readonly toast = inject(ToastService);
  protected readonly editing = signal(false);
  protected readonly parentChildEdit = signal(false);
  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly photoSaving = signal(false);
  protected readonly photoPending = signal(false);
  protected readonly photoMessage = signal('');
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
      this.toast.error(error instanceof Error ? error.message : 'Student form options could not be loaded.');
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
      this.toast.error(error instanceof Error ? error.message : 'Student could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
  protected async save(): Promise<void> {
    if (this.loading() || this.photoSaving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Complete all required fields correctly.');
      return;
    }
    const { firstName, lastName, ...value } = this.form.getRawValue();
    const fullName = `${firstName} ${lastName}`.trim();
    this.loading.set(true);
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
      this.toast.error(error instanceof Error ? error.message : 'Student could not be saved.');
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
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.photoMessage.set('Choose a JPG or PNG image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.photoMessage.set('Student photo must be 2MB or smaller.');
      return;
    }
    this.selectedPhoto = file;
    this.photoPending.set(true);
    this.photoMessage.set(this.editing() ? 'Photo selected. Select Save photo to upload it.' : 'Photo will upload when you save the student.');
    const reader = new FileReader();
    reader.onload = () => {
      if (this.selectedPhoto === file) this.photoUrl.set(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  protected async savePhoto(): Promise<void> {
    if (!this.studentId || !this.selectedPhoto || this.photoSaving() || this.loading()) return;
    this.photoSaving.set(true);
    this.photoMessage.set('Uploading photo...');
    try {
      this.photoUrl.set(await this.students.updateStudentPhoto(this.studentId, this.selectedPhoto));
      this.selectedPhoto = null;
      this.photoPending.set(false);
      this.photoMessage.set('');
      this.toast.success('Photo saved to this student’s profile.');
    } catch (error) {
      this.photoMessage.set('');
      this.toast.error(error instanceof Error ? error.message : 'Photo could not be saved. Please try again.');
    } finally {
      this.photoSaving.set(false);
    }
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
