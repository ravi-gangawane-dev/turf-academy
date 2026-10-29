import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { mapAttendance, SupabaseAttendanceRepository } from './supabase-attendance.repository';

function setup(fetch: typeof globalThis.fetch) {
  const client = createClient('https://unit-test.supabase.co', 'unit-test-key', {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  TestBed.configureTestingModule({
    providers: [{ provide: SupabaseClientService, useValue: { requireClient: () => client } }],
  });
  return client;
}

const workspaceRow = {
  enrollment_id: 'e1',
  student_id: 's1',
  student_name: 'Aarav Sharma',
  student_date_of_birth: '2014-05-06',
  student_skill_level: 'beginner',
  student_status: 'active',
  batch_id: 'b1',
  batch_name: 'Under 10',
  batch_capacity: 20,
  batch_start_time: '16:00',
  batch_end_time: '17:00',
  monthly_fee: 1000,
  valid_from: '2026-09-01',
  valid_till: null,
  attendance_id: 'a1',
  check_in_at: '2026-10-22T10:00:00Z',
  check_out_at: null,
  attendance_status: 'checked_in',
  total: 1,
};

describe('mapAttendance', () => {
  it('maps a database row onto the attendance record', () => {
    expect(
      mapAttendance({
        id: 'a1',
        student_id: 's1',
        batch_id: 'b1',
        attendance_date: '2026-10-22',
        check_in_at: '2026-10-22T10:00:00Z',
        check_out_at: '2026-10-22T11:00:00Z',
        status: 'checked_out',
      }),
    ).toEqual({
      id: 'a1',
      studentId: 's1',
      batchId: 'b1',
      businessDate: '2026-10-22',
      checkInAt: '2026-10-22T10:00:00Z',
      checkOutAt: '2026-10-22T11:00:00Z',
      status: 'checked-out',
    });
  });

  it('leaves a missing check-in and check-out empty', () => {
    const record = mapAttendance({
      id: 'a2',
      student_id: 's1',
      batch_id: 'b1',
      attendance_date: '2026-10-22',
      check_in_at: null,
      check_out_at: null,
      status: 'absent',
    });
    expect(record.checkInAt).toBe('');
    expect(record.checkOutAt).toBeUndefined();
    expect(record.status).toBe('absent');
  });
});

describe('SupabaseAttendanceRepository.workspace', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('loads one bounded page and turns the fee into paise', async () => {
    const requests: URL[] = [];
    setup(async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      return new Response(JSON.stringify([workspaceRow]), {
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const workspace = await TestBed.inject(SupabaseAttendanceRepository).workspace();
    expect(requests[0]?.pathname).toContain('/rpc/get_attendance_workspace_page');
    expect(workspace.students).toHaveLength(1);
    expect(workspace.students[0]?.name).toBe('Aarav Sharma');
    expect(workspace.batches[0]?.monthlyFeePaise).toBe(100000);
    expect(workspace.enrollments[0]?.monthlyFeePaise).toBe(100000);
    expect(workspace.attendance[0]?.status).toBe('checked_in');
  });

  it('lists a student and a batch once even when several rows repeat them', async () => {
    setup(async () =>
      new Response(JSON.stringify([workspaceRow, { ...workspaceRow, enrollment_id: 'e2' }]), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const workspace = await TestBed.inject(SupabaseAttendanceRepository).workspace();
    expect(workspace.students).toHaveLength(1);
    expect(workspace.batches).toHaveLength(1);
    expect(workspace.enrollments).toHaveLength(2);
  });

  it('reports a database failure as a data request error', async () => {
    setup(async () =>
      new Response(JSON.stringify({ message: 'relation missing' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(TestBed.inject(SupabaseAttendanceRepository).workspace()).rejects.toThrow(
      'This request could not be completed',
    );
  });
});

describe('SupabaseAttendanceRepository.checkIn', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('checks the student in by id so manual entry needs no QR profile', async () => {
    const bodies: Record<string, unknown>[] = [];
    const requests: URL[] = [];
    setup(async (input, init) => {
      const url = new URL(String(input));
      requests.push(url);
      if (init?.body) bodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return new Response(
        JSON.stringify({
          id: 'a1',
          student_id: 's1',
          batch_id: 'b1',
          attendance_date: '2026-10-23',
          check_in_at: '2026-10-23T10:00:00Z',
          check_out_at: null,
          status: 'present',
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    });
    const record = await TestBed.inject(SupabaseAttendanceRepository).checkIn(
      's1',
      'b1',
      'manual',
      'key-1',
    );
    expect(requests[0]?.pathname).toContain('/rpc/attendance_check_in');
    expect(bodies[0]).toEqual({
      p_qr_token: null,
      p_batch_id: 'b1',
      p_source: 'manual',
      p_idempotency_key: 'key-1',
      p_student_id: 's1',
    });
    expect(record.id).toBe('a1');
    expect(record.status).toBe('present');
  });

  it('surfaces a duplicate/conflict as a data request error', async () => {
    setup(async () =>
      new Response(
        JSON.stringify({ code: '23505', message: 'attendance_already_recorded' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    await expect(
      TestBed.inject(SupabaseAttendanceRepository).checkIn('s1', 'b1', 'manual'),
    ).rejects.toThrow('This record already exists. Check the details and try again.');
  });
});


describe('QR business date', () => {
  afterEach(() => { vi.useRealTimers(); TestBed.resetTestingModule(); });

  it('queries the India date after local midnight instead of the previous UTC day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T19:00:00Z'));
    const requests: URL[] = [];
    setup(async input => {
      const url = new URL(String(input)); requests.push(url);
      const table = url.pathname.split('/').pop();
      const data = table === 'qr_profiles' ? { student_id: 's1' }
        : table === 'students' ? { id: 's1', full_name: 'Student', status: 'active' }
        : table === 'enrollments' ? [{ id: 'e1', student_id: 's1', monthly_fee: 100,
          batch: { id: 'b1', name: 'Batch', capacity: 10 } }]
        : null;
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    });
    await TestBed.inject(SupabaseAttendanceRepository).identifyQr('token');
    expect(requests.find(url => url.pathname.endsWith('/attendance_records'))?.searchParams.get('attendance_date'))
      .toBe('eq.2026-10-28');
    expect(requests.find(url => url.pathname.endsWith('/enrollments'))?.searchParams.get('valid_from'))
      .toBe('lte.2026-10-28');
  });
});
