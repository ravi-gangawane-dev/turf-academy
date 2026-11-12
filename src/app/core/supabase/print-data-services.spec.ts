import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';
import { DatabaseService } from './database.service';
import { BatchesService, EnrollmentsService } from './domain-services';

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function setup(fetch: typeof globalThis.fetch) {
  const client = createClient('https://unit-test.supabase.co', 'unit-test-key', {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  TestBed.configureTestingModule({
    providers: [{ provide: DatabaseService, useValue: { client } }],
  });
}

const enrollmentRow = {
  id: 'e1',
  student_id: 's1',
  batch_id: 'b1',
  fee_plan_id: 'p1',
  status: 'active',
  valid_from: '2026-11-03',
  valid_till: '2027-02-02',
  monthly_fee: 4500,
  notes: 'Recorded notes',
  student: {
    id: 's1',
    student_code: 'TCA-STU-0001',
    full_name: 'Aarav Patil',
    date_of_birth: '2014-02-01',
    phone: null,
    status: 'active',
  },
  batch: {
    id: 'b1',
    code: 'B-MOR',
    name: 'Morning Elite',
    age_group: 'Under 14',
    skill_level: 'Intermediate',
    start_date: '2026-11-01',
    end_date: '2027-03-31',
    start_time: '06:30:00',
    end_time: '08:00:00',
    status: 'active',
    capacity: 20,
    batch_days: [{ day_of_week: 3 }, { day_of_week: 1 }],
    batch_coaches: [{ coach: { full_name: 'Coach Rao' } }],
  },
  plan: {
    id: 'p1',
    name: 'Quarterly Training',
    monthly_fee: 4500,
    registration_fee: 1000,
    duration_months: 3,
    status: 'active',
  },
};

const batchRow = {
  id: 'b1',
  code: 'B-MOR',
  name: 'Morning Elite',
  age_group: 'Under 14',
  skill_level: 'Intermediate',
  capacity: 20,
  start_date: '2026-11-01',
  end_date: '2027-03-31',
  start_time: '06:30:00',
  end_time: '08:00:00',
  status: 'active',
  batch_days: [{ day_of_week: 5 }, { day_of_week: 1 }],
  batch_coaches: [{ coach: { full_name: 'Coach Rao' } }, { coach: null }],
};

describe('Enrollment confirmation data', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('reads the live enrollment, active guardians and latest transfer batch', async () => {
    const requested: string[] = [];
    setup(async (input) => {
      const url = new URL(String(input));
      requested.push(url.pathname);
      if (url.pathname.endsWith('/enrollments')) return response(enrollmentRow);
      if (url.pathname.endsWith('/student_parents')) {
        expect(url.searchParams.get('student_id')).toBe('eq.s1');
        return response([
          {
            is_primary: false,
            can_pick_up: false,
            parent: {
              id: 'g2',
              full_name: 'Neha Patil',
              relation: 'Mother',
              phone: '+91 98765 43212',
              whatsapp: null,
              email: null,
              status: 'active',
            },
          },
          {
            is_primary: true,
            can_pick_up: true,
            parent: {
              id: 'g1',
              full_name: 'Ravi Patil',
              relation: 'Father',
              phone: '+91 98765 43211',
              whatsapp: '+91 98765 43213',
              email: 'ravi@example.com',
              status: 'active',
            },
          },
          {
            is_primary: true,
            can_pick_up: true,
            parent: {
              id: 'g3',
              full_name: 'Inactive Guardian',
              relation: 'Guardian',
              phone: '+91 98765 43214',
              whatsapp: null,
              email: null,
              status: 'inactive',
            },
          },
        ]);
      }
      if (url.pathname.endsWith('/enrollment_history')) {
        expect(url.searchParams.get('event_type')).toBe('eq.transferred');
        expect(url.searchParams.get('order')).toBe('created_at.desc');
        return response({ from_batch: { name: 'Evening Development', code: 'B-EVE' } });
      }
      return response([]);
    });

    const record = await TestBed.inject(EnrollmentsService).confirmation(' e1 ');

    expect(requested[0]).toBe('/rest/v1/enrollments');
    expect(requested).toEqual(
      expect.arrayContaining(['/rest/v1/student_parents', '/rest/v1/enrollment_history']),
    );
    expect(requested).toHaveLength(3);
    expect(record).toMatchObject({
      enrollment: expect.objectContaining({
        id: 'e1',
        student_id: 's1',
        batch_id: 'b1',
        fee_plan_id: 'p1',
        status: 'active',
        valid_from: '2026-11-03',
        valid_till: '2027-02-02',
        monthly_fee: 4500,
        notes: 'Recorded notes',
      }),
      student: expect.objectContaining({ id: 's1', full_name: 'Aarav Patil' }),
      batch: expect.objectContaining({ name: 'Morning Elite', code: 'B-MOR' }),
      plan: expect.objectContaining({
        name: 'Quarterly Training',
        registration_fee: 1000,
        duration_months: 3,
      }),
      previousBatch: { name: 'Evening Development', code: 'B-EVE' },
    });
    expect(record.guardians.map((guardian) => guardian.id)).toEqual(['g1', 'g2']);
    expect(record.guardians[0]).toMatchObject({ is_primary: true, can_pick_up: true });
  });

  it('rejects a blank enrollment id without contacting the API', async () => {
    const fetch = vi.fn();
    setup(fetch);

    await expect(TestBed.inject(EnrollmentsService).confirmation('  ')).rejects.toThrow(
      'Choose an enrollment to print.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('Batch roster data', () => {
  afterEach(() => TestBed.resetTestingModule());

  function rosterFetch(options: {
    includeMedical?: boolean;
    students?: unknown[];
    guardians?: unknown[];
    medical?: unknown[];
    requests?: string[];
  }) {
    return async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      options.requests?.push(url.pathname);
      if (url.pathname.endsWith('/batches')) return response(batchRow);
      if (url.pathname.endsWith('/enrollments')) {
        expect(url.searchParams.get('batch_id')).toBe('eq.b1');
        expect(url.searchParams.get('status')).toBe('eq.active');
        return response(
          options.students ?? [
            {
              student_id: 's1',
              status: 'active',
              student: {
                id: 's1',
                student_code: 'TCA-STU-0001',
                full_name: 'Aarav Patil',
                date_of_birth: '2014-02-01',
                status: 'active',
              },
            },
            {
              student_id: 's2',
              status: 'active',
              student: {
                id: 's2',
                student_code: 'TCA-STU-0002',
                full_name: 'Diya Patil',
                date_of_birth: '2015-06-12',
                status: 'active',
              },
            },
            { student_id: 's3', status: 'active', student: null },
          ],
        );
      }
      if (url.pathname.endsWith('/student_parents')) {
        expect(url.searchParams.get('student_id')).toBe('in.(s1,s2)');
        return response(
          options.guardians ?? [
            {
              student_id: 's1',
              is_primary: false,
              can_pick_up: false,
              parent: {
                full_name: 'Neha Patil',
                relation: 'Mother',
                phone: '+91 98765 43212',
                whatsapp: null,
              },
            },
            {
              student_id: 's1',
              is_primary: true,
              can_pick_up: true,
              parent: {
                full_name: 'Ravi Patil',
                relation: 'Father',
                phone: '+91 98765 43211',
                whatsapp: '+91 98765 43213',
              },
            },
            {
              student_id: 's2',
              is_primary: true,
              can_pick_up: false,
              parent: {
                full_name: 'Meera Patel',
                relation: 'Mother',
                phone: '+91 98765 43214',
                whatsapp: null,
              },
            },
          ],
        );
      }
      if (url.pathname.endsWith('/student_medical_records')) {
        expect(options.includeMedical).toBe(true);
        return response(
          options.medical ?? [
            {
              student_id: 's1',
              blood_group: 'B+',
              allergies: 'None',
              conditions: null,
              medications: null,
              emergency_notes: 'Call guardian first',
            },
          ],
        );
      }
      return response([]);
    };
  }

  it('builds the roster from active enrollments, live guardians and batch coaches', async () => {
    const requests: string[] = [];
    setup(rosterFetch({ includeMedical: true, requests }));

    const record = await TestBed.inject(BatchesService).roster(' b1 ', true);

    expect(requests).toEqual([
      '/rest/v1/batches',
      '/rest/v1/enrollments',
      '/rest/v1/student_parents',
      '/rest/v1/student_medical_records',
    ]);
    expect(record).toMatchObject({
      batch: expect.objectContaining({ id: 'b1', name: 'Morning Elite', code: 'B-MOR' }),
      coaches: ['Coach Rao'],
    });
    expect(record.rows.map((row) => row.studentId)).toEqual(['s1', 's2']);
    expect(record.rows[0]).toMatchObject({
      studentCode: 'TCA-STU-0001',
      studentName: 'Aarav Patil',
      dateOfBirth: '2014-02-01',
      status: 'active',
      medical: 'Blood group B+ · Allergies: None · Emergency: Call guardian first',
    });
    expect(record.rows[0].guardians.map((guardian) => guardian.name)).toEqual([
      'Ravi Patil',
      'Neha Patil',
    ]);
    expect(record.rows[0].guardians[0]).toMatchObject({
      isPrimary: true,
      canPickUp: true,
      whatsapp: '+91 98765 43213',
    });
    expect(record.rows[1].medical).toBeNull();
  });

  it('never queries medical records when the caller cannot include them', async () => {
    const requests: string[] = [];
    setup(rosterFetch({ includeMedical: false, requests }));

    const record = await TestBed.inject(BatchesService).roster('b1', false);

    expect(requests).toEqual([
      '/rest/v1/batches',
      '/rest/v1/enrollments',
      '/rest/v1/student_parents',
    ]);
    expect(record.rows.every((row) => row.medical === null)).toBe(true);
  });

  it('skips guardian and medical queries when the batch has no active students', async () => {
    const requests: string[] = [];
    setup(
      rosterFetch({
        includeMedical: true,
        students: [],
        guardians: [],
        medical: [],
        requests,
      }),
    );

    const record = await TestBed.inject(BatchesService).roster('b1', true);

    expect(requests).toEqual(['/rest/v1/batches', '/rest/v1/enrollments']);
    expect(record.rows).toEqual([]);
  });

  it('rejects a blank batch id without contacting the API', async () => {
    const fetch = vi.fn();
    setup(fetch);

    await expect(TestBed.inject(BatchesService).roster('')).rejects.toThrow(
      'Choose a batch to print the roster.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
