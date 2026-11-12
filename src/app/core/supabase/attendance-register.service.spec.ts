import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';
import { DatabaseService } from './database.service';
import { AttendanceService } from './domain-services';

function response(body: unknown, status = 200, count?: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(count === undefined ? {} : { 'Content-Range': `0-499/${count}` }),
    },
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

describe('AttendanceService register', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('builds a batch/day register from enrollments and attendance records', async () => {
    const requests: URL[] = [];
    setup(async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      const table = url.pathname.split('/').pop();
      if (table === 'batches') {
        return response({
          id: 'b1',
          code: 'B-MOR',
          name: 'Morning Elite',
          start_time: '06:30:00',
          end_time: '08:00:00',
        });
      }
      if (table === 'batch_coaches') {
        return response([
          { coach: { id: 'c1', full_name: 'Coach Rao' } },
          { coach: [{ id: 'c2', full_name: 'Coach Iyer' }] },
        ]);
      }
      if (table === 'enrollments') {
        return response(
          [
            { student: { id: 's1', full_name: 'Aarav Patil', student_code: 'TCA-1' } },
            { student: [{ id: 's2', full_name: 'Diya Patel', student_code: 'TCA-2' }] },
          ],
          200,
          2,
        );
      }
      return response(
        [
          {
            student_id: 's1',
            status: 'present',
            check_in_at: '2026-10-15T01:00:00Z',
            check_out_at: null,
            remarks: 'On time',
            source: 'manual',
          },
          {
            student_id: 's2',
            status: 'late',
            check_in_at: '2026-10-15T01:30:00Z',
            check_out_at: '2026-10-15T02:30:00Z',
            remarks: 'Traffic on the way',
            source: 'manual',
          },
        ],
        200,
        2,
      );
    });

    const register = await TestBed.inject(AttendanceService).register('b1', '2026-10-15', {
      includeRemarks: true,
    });

    expect(register).toMatchObject({
      date: '2026-10-15',
      batchId: 'b1',
      batchCode: 'B-MOR',
      batchName: 'Morning Elite',
      batchTime: '06:30 – 08:00',
      coaches: ['Coach Iyer', 'Coach Rao'],
      counts: {
        expected: 2,
        present: 1,
        late: 1,
        absent: 0,
        checkedOut: 0,
        notRecorded: 0,
      },
    });
    expect(register.rows[0]).toMatchObject({
      studentId: 's1',
      studentName: 'Aarav Patil',
      studentCode: 'TCA-1',
      status: 'present',
      remarks: 'On time',
      source: 'manual',
    });
    expect(register.rows[1]).toMatchObject({
      studentId: 's2',
      studentName: 'Diya Patel',
      status: 'late',
      remarks: 'Traffic on the way',
    });

    const enrollment = requests.find((url) => url.pathname.endsWith('/enrollments'))!;
    expect(enrollment.searchParams.get('batch_id')).toBe('eq.b1');
    expect(enrollment.searchParams.get('status')).toBe('eq.active');
    expect(enrollment.searchParams.get('valid_from')).toBe('lte.2026-10-15');
    expect(enrollment.searchParams.get('or')).toContain('valid_till');
    const attendance = requests.find((url) =>
      url.pathname.endsWith('/attendance_records'),
    )!;
    expect(attendance.searchParams.get('batch_id')).toBe('eq.b1');
    expect(attendance.searchParams.get('attendance_date')).toBe('eq.2026-10-15');
  });

  it('keeps unrecorded students and withholds remarks without permission', async () => {
    setup(async (input) => {
      const url = new URL(String(input));
      const table = url.pathname.split('/').pop();
      if (table === 'batches') {
        return response({ id: 'b1', code: 'B-MOR', name: 'Morning Elite' });
      }
      if (table === 'batch_coaches') return response([]);
      if (table === 'enrollments') {
        return response(
          [
            { student: { id: 's1', full_name: 'Aarav Patil', student_code: 'TCA-1' } },
            { student: { id: 's2', full_name: 'Diya Patel', student_code: 'TCA-2' } },
          ],
          200,
          2,
        );
      }
      return response(
        [
          {
            student_id: 's1',
            status: 'present',
            check_in_at: '2026-10-15T01:00:00Z',
            check_out_at: null,
            remarks: 'Should not print',
            source: 'manual',
          },
        ],
        200,
        1,
      );
    });

    const register = await TestBed.inject(AttendanceService).register('b1', '2026-10-15');
    expect(register.rows.map((row) => [row.studentName, row.status])).toEqual([
      ['Aarav Patil', 'present'],
      ['Diya Patel', 'not_recorded'],
    ]);
    expect(register.rows[0].remarks).toBeNull();
    expect(register.counts).toMatchObject({ expected: 2, present: 1, notRecorded: 1 });
    expect(register.coaches).toEqual([]);
    expect(register.batchTime).toBe('');
  });

  it('maps unknown attendance statuses to not recorded', async () => {
    setup(async (input) => {
      const url = new URL(String(input));
      const table = url.pathname.split('/').pop();
      if (table === 'batches') return response({ id: 'b1', name: 'Morning Elite' });
      if (table === 'batch_coaches') return response([]);
      if (table === 'enrollments') {
        return response(
          [{ student: { id: 's1', full_name: 'Aarav Patil', student_code: 'TCA-1' } }],
          200,
          1,
        );
      }
      return response([{ student_id: 's1', status: 'excused' }], 200, 1);
    });

    const register = await TestBed.inject(AttendanceService).register('b1', '2026-10-15');
    expect(register.rows[0].status).toBe('not_recorded');
    expect(register.counts.notRecorded).toBe(1);
  });

  it('lists a student once when overlapping enrolments produce duplicate rows', async () => {
    setup(async (input) => {
      const url = new URL(String(input));
      const table = url.pathname.split('/').pop();
      if (table === 'batches') return response({ id: 'b1', name: 'Morning Elite' });
      if (table === 'batch_coaches') return response([]);
      if (table === 'enrollments') {
        return response(
          [
            { student: { id: 's1', full_name: 'Aarav Patil', student_code: 'TCA-1' } },
            { student: [{ id: 's1', full_name: 'Aarav Patil', student_code: 'TCA-1' }] },
            { student: { id: 's2', full_name: 'Diya Patel', student_code: 'TCA-2' } },
          ],
          200,
          3,
        );
      }
      return response([{ student_id: 's1', status: 'present' }], 200, 1);
    });

    const register = await TestBed.inject(AttendanceService).register('b1', '2026-10-15');
    expect(register.rows.map((row) => row.studentId)).toEqual(['s1', 's2']);
    expect(register.counts).toMatchObject({ expected: 2, present: 1, notRecorded: 1 });
  });

  it('rejects a missing batch or malformed date before querying', async () => {
    const fetch = vi.fn();
    setup(fetch);
    const service = TestBed.inject(AttendanceService);

    await expect(service.register('', '2026-10-15')).rejects.toThrow('Choose a batch');
    await expect(service.register('b1', '15-10-2026')).rejects.toThrow('valid date');
    expect(fetch).not.toHaveBeenCalled();
  });
});
