import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { CoachDetailRecord, CoachesService } from '../../core/supabase/domain-services';
import { CoachFormPage } from './coach-form-page';

const coach: CoachDetailRecord = {
  id: 'c1',
  profile_id: null,
  employee_code: 'EMP-1',
  full_name: 'Aarav Sharma',
  phone: '9876543210',
  email: 'aarav@example.com',
  date_of_birth: '1990-05-06',
  experience_years: 7,
  qualification: 'Level 3',
  biography: 'Trains the U-10 squad.',
  photo_path: null,
  photo_url: 'https://cdn.example.com/aarav.png',
  status: 'active',
  created_at: '2026-01-01',
  coach_specializations: [
    { specialization: 'Cricket' },
    { specialization: 'Football' },
  ],
  batch_coaches: [],
};

function setup(id: string | null) {
  const getById = vi.fn().mockResolvedValue(coach);
  const create = vi.fn().mockResolvedValue({ ...coach, id: 'c9' });
  const update = vi.fn().mockResolvedValue({ ...coach, id: 'c1' });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
      },
      { provide: CoachesService, useValue: { getById, create, update } },
    ],
  });
  const fixture = TestBed.createComponent(CoachFormPage);
  return { fixture, page: fixture.componentInstance, getById, create, update };
}

const validForm = {
  employeeCode: 'EMP-9',
  firstName: 'Diya',
  lastName: 'Menon',
  phone: '9812345678',
  email: 'diya@example.com',
  dateOfBirth: '1992-01-02',
  experienceYears: 4,
  status: 'active',
  qualification: 'Level 2',
  primarySpecialization: 'Cricket',
  additionalSpecializations: 'Football, Athletics',
  biography: 'Junior squad coach.',
};

describe('CoachFormPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const { page } = setup(null);
    expect(page).toBeTruthy();
  });

  it('starts in create mode when the route carries no id', async () => {
    const { page, getById } = setup(null);
    await page.ngOnInit();
    expect(page['editing']()).toBe(false);
    expect(getById).not.toHaveBeenCalled();
  });

  it('loads the coach and splits the full name into first and last name', async () => {
    const { page, getById } = setup('c1');
    await page.ngOnInit();
    expect(getById).toHaveBeenCalledWith('c1');
    expect(page['editing']()).toBe(true);
    const value = page['form'].getRawValue();
    expect(value.employeeCode).toBe('EMP-1');
    expect(value.firstName).toBe('Aarav');
    expect(value.lastName).toBe('Sharma');
    expect(value.primarySpecialization).toBe('Cricket');
    expect(value.additionalSpecializations).toBe('Football');
    expect(page['photoUrl']()).toBe('https://cdn.example.com/aarav.png');
  });

  it('reports a load failure without crashing the form', async () => {
    const { page, getById } = setup('c1');
    getById.mockRejectedValue(new Error('Coach could not be loaded.'));
    await page.ngOnInit();
    expect(page['message']()).toBe('Coach could not be loaded.');
    expect(page['loading']()).toBe(false);
  });

  it('refuses to save an incomplete form', async () => {
    const { page, create } = setup(null);
    await page.ngOnInit();
    await page['save']();
    expect(create).not.toHaveBeenCalled();
    expect(page['message']()).toBe('Complete all required fields correctly.');
  });

  it('creates the coach with the trimmed payload and navigates to it', async () => {
    const { page, create } = setup(null);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await page.ngOnInit();
    page['form'].patchValue(validForm);
    await page['save']();
    expect(create).toHaveBeenCalledWith(
      {
        employee_code: 'EMP-9',
        full_name: 'Diya Menon',
        phone: '9812345678',
        email: 'diya@example.com',
        date_of_birth: '1992-01-02',
        experience_years: 4,
        qualification: 'Level 2',
        biography: 'Junior squad coach.',
        status: 'active',
      },
      ['Cricket', 'Football', ' Athletics'],
      null,
    );
    expect(navigate).toHaveBeenCalledWith(['/coaches', 'c9'], {
      state: { success: 'Coach created successfully.' },
    });
  });

  it('updates the existing coach when the route carries an id', async () => {
    const { page, update, create } = setup('c1');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await page.ngOnInit();
    page['form'].patchValue(validForm);
    await page['save']();
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
    expect(update.mock.calls[0][0]).toBe('c1');
    expect(navigate).toHaveBeenCalledWith(['/coaches', 'c1'], {
      state: { success: 'Coach updated successfully.' },
    });
  });

  it('surfaces a save failure to the user', async () => {
    const { page, create } = setup(null);
    create.mockRejectedValue(new Error('Coach could not be saved.'));
    await page.ngOnInit();
    page['form'].patchValue(validForm);
    await page['save']();
    expect(page['message']()).toBe('Coach could not be saved.');
    expect(page['loading']()).toBe(false);
  });
});
