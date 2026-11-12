import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { StudentFormRecord, StudentListService } from './student-list.service';
import { StudentFormPage } from './student-form-page';
import { ToastService } from '../../shared/toast/toast.service';

const student: StudentFormRecord = {
  id: 's1',
  studentCode: 'ST-1',
  status: 'active' as const,
  fullName: 'Aarav Sharma',
  dateOfBirth: '2014-05-06',
  gender: 'Male',
  skillLevel: 'Beginner',
  phone: '9876543210',
  email: 'aarav@example.com',
  address: '12 MG Road',
  city: 'Pune',
  state: null,
  pinCode: '411001',
  joinedOn: '2026-06-01',
  photoUrl: 'https://cdn.example.com/aarav.png',
  bloodGroup: 'B+',
  nationality: 'Indian',
  aadhaar: '123456789012',
  batchId: 'b1',
  coachId: 'c1',
  parentName: 'Ravi Sharma',
  parentRelation: 'Father',
  parentPhone: '9812345678',
  parentEmail: 'ravi@example.com',
};

function setup(options: { id?: string; parentChildEdit?: boolean } = {}) {
  const filters = vi.fn().mockResolvedValue({
    batches: [{ id: 'b1', name: 'U-10' }],
    programs: [],
    coaches: [],
  });
  const getById = vi.fn().mockResolvedValue(student);
  const createStudent = vi.fn().mockResolvedValue('s9');
  const updateStudent = vi.fn().mockResolvedValue(undefined);
  const updateStudentPhoto = vi.fn().mockResolvedValue('https://cdn.example.com/new-photo.png');
  const updateLinkedChildProfile = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap(options.id ? { id: options.id } : {}),
            data: { parentChildEdit: options.parentChildEdit === true },
          },
        },
      },
      {
        provide: StudentListService,
        useValue: { filters, getById, createStudent, updateStudent, updateLinkedChildProfile, updateStudentPhoto },
      },
    ],
  });
  const fixture = TestBed.createComponent(StudentFormPage);
  return { fixture, page: fixture.componentInstance, filters, getById, createStudent, updateStudent, updateLinkedChildProfile, updateStudentPhoto };
}

const validForm = {
  firstName: 'Diya',
  lastName: 'Menon',
  dateOfBirth: '2015-02-03',
  mobile: '9812345678',
  address: '5 Park Street',
  city: 'Pune',
  pinCode: '411001',
  program: 'b1',
  joiningDate: '2026-07-01',
  parentName: 'Suresh Menon',
  whatsapp: '9812345000',
};

describe('StudentFormPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const { page } = setup();
    expect(page).toBeTruthy();
  });

  it('loads the batch, program and coach options for the form', async () => {
    const { page, filters } = setup();
    await page.ngOnInit();
    expect(filters).toHaveBeenCalled();
    expect(page['editing']()).toBe(false);
  });

  it('loads an existing student and splits the name into first and last name', async () => {
    const { page, getById } = setup({ id: 's1' });
    await page.ngOnInit();
    expect(getById).toHaveBeenCalledWith('s1');
    expect(page['editing']()).toBe(true);
    const value = page['form'].getRawValue();
    expect(value.firstName).toBe('Aarav');
    expect(value.lastName).toBe('Sharma');
    expect(value.program).toBe('b1');
    expect(value.whatsapp).toBe('9812345678');
  });

  it('reports a load failure without breaking the form', async () => {
    const { page, getById } = setup({ id: 's1' });
    getById.mockRejectedValue(new Error('Student could not be loaded.'));
    await page.ngOnInit();
    const toast = vi.spyOn(TestBed.inject(ToastService), 'error');
    expect(toast).toHaveBeenCalledWith('Student could not be loaded.');
    expect(page['loading']()).toBe(false);
  });

  it('refuses to save an incomplete form', async () => {
    const { page, createStudent } = setup();
    await page.ngOnInit();
    await page['save']();
    expect(createStudent).not.toHaveBeenCalled();
    const toast = vi.spyOn(TestBed.inject(ToastService), 'error');
    expect(toast).toHaveBeenCalledWith('Complete all required fields correctly.');
  });

  it('creates a student with the full name and navigates back to the list', async () => {
    const { page, createStudent } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await page.ngOnInit();
    page['form'].patchValue(validForm);
    await page['save']();
    expect(createStudent).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Diya Menon',
        phone: '9812345678',
        batchId: 'b1',
        parentName: 'Suresh Menon',
        parentPhone: '9812345000',
      }),
    );
    expect(navigate).toHaveBeenCalledWith(['/students'], {
      state: { success: 'Student created successfully.' },
    });
  });

  it('updates the student and returns to the list', async () => {
    const { page, updateStudent, createStudent } = setup({ id: 's1' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await page.ngOnInit();
    page['form'].patchValue(validForm);
    await page['save']();
    expect(createStudent).not.toHaveBeenCalled();
    expect(updateStudent).toHaveBeenCalledWith('s1', expect.objectContaining({ fullName: 'Diya Menon' }));
    expect(navigate).toHaveBeenCalledWith(['/students'], {
      state: { success: 'Student updated successfully.' },
    });
  });

  it('drops the guardian and program rules when a parent edits their child', async () => {
    const { page, updateLinkedChildProfile } = setup({ id: 's1', parentChildEdit: true });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await page.ngOnInit();
    expect(page['parentChildEdit']()).toBe(true);
    const form = page['form'];
    form.patchValue({ firstName: 'Aarav', lastName: 'Sharma', dateOfBirth: '2014-05-06', mobile: '9876543210', address: '12 MG Road', city: 'Pune', pinCode: '411001', joiningDate: '2026-06-01' });
    expect(form.valid).toBe(true);
    await page['save']();
    expect(updateLinkedChildProfile).toHaveBeenCalledWith('s1', expect.objectContaining({ fullName: 'Aarav Sharma' }));
    expect(navigate).toHaveBeenCalledWith(['/parent/children', 's1'], {
      state: { success: 'Child profile updated successfully.' },
    });
  });

  it('saves a photo to the linked student even when other profile fields are incomplete', async () => {
    const { page, updateStudentPhoto, updateLinkedChildProfile } = setup({ id: 's1', parentChildEdit: true });
    await page.ngOnInit();
    page['form'].patchValue({ mobile: '', address: '' });
    const photo = new File(['photo'], 'student.png', { type: 'image/png' });
    page['selectPhoto']({ target: { files: [photo], value: 'student.png' } } as unknown as Event);
    expect(page['form'].invalid).toBe(true);
    await page['savePhoto']();
    expect(updateStudentPhoto).toHaveBeenCalledWith('s1', photo);
    expect(updateLinkedChildProfile).not.toHaveBeenCalled();
    expect(page['photoUrl']()).toBe('https://cdn.example.com/new-photo.png');
    expect(page['photoPending']()).toBe(false);
  });

  it('keeps the selected photo available for retry after upload failure', async () => {
    const { page, updateStudentPhoto } = setup({ id: 's1', parentChildEdit: true });
    await page.ngOnInit();
    const photo = new File(['photo'], 'student.png', { type: 'image/png' });
    page['selectPhoto']({ target: { files: [photo], value: '' } } as unknown as Event);
    updateStudentPhoto.mockRejectedValueOnce(new Error('Upload denied'));
    await page['savePhoto']();
    const toast = vi.spyOn(TestBed.inject(ToastService), 'error');
    expect(toast).toHaveBeenCalledWith('Upload denied');
    expect(page['photoPending']()).toBe(true);
    expect(page['photoSaving']()).toBe(false);
    await page['savePhoto']();
    expect(updateStudentPhoto).toHaveBeenCalledTimes(2);
  });

  it('rejects unsupported images and files larger than 2MB', async () => {
    const { page, updateStudentPhoto } = setup({ id: 's1' });
    await page.ngOnInit();
    for (const photo of [new File(['text'], 'file.txt', { type: 'text/plain' }),
    new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })]) {
      page['selectPhoto']({ target: { files: [photo], value: '' } } as unknown as Event);
      await page['savePhoto']();
    }
    expect(updateStudentPhoto).not.toHaveBeenCalled();
    expect(page['photoPending']()).toBe(false);
  });

  it('surfaces a save failure to the user', async () => {
    const { page, createStudent } = setup();
    createStudent.mockRejectedValue(new Error('Student could not be saved.'));
    await page.ngOnInit();
    page['form'].patchValue(validForm);
    await page['save']();
    const toast = vi.spyOn(TestBed.inject(ToastService), 'error');
    expect(toast).toHaveBeenCalledWith('Student could not be saved.');
    expect(page['loading']()).toBe(false);
  });
});