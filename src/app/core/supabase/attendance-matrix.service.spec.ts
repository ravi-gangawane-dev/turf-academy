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

function tableRequest(urls: URL[], table: string): URL | undefined {
  return urls.find((url) => url.pathname.endsWith(`/${table}`));
}

describe('AttendanceService matrix', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('builds a month grid with scheduled days, enrolment bounds and percentages', async () => {
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
      if (table === 'batch_days') {
        return response([{ day_of_week: 1 }, { day_of_week: 3 }, { day_of_week: 5 }]);
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
            {
              valid_from: '2026-10-01',
              valid_till: null,
              student: { id: 's1', full_name: 'Aarav Patil', student_code: 'TCA-1' },
            },
            {
              valid_from: '2026-10-15',
              valid_till: null,
              student: { id: 's2', full_name: 'Diya Patel', student_code: 'TCA-2' },
            },
          ],
          200,
          2,
        );
      }
      return response(
        [
          { student_id: 's1', attendance_date: '2026-10-05', status: 'present' },
          { student_id: 's1', attendance_date: '2026-10-07', status: 'late' },
          { student_id: 's1', attendance_date: '2026-10-09', status: 'absent' },
          { student_id: 's1', attendance_date: '2026-10-12', status: 'present' },
          { student_id: 's1', attendance_date: '2026-10-14', status: 'excused' },
          { student_id: 's2', attendance_date: '2026-10-16', status: 'present' },
          { student_id: 's2', attendance_date: '2026-10-19', status: 'checked_out' },
        ],
        200,
        7,
      );
    });

    const matrix = await TestBed.inject(AttendanceService).matrix('b1', '2026-10');

    expect(matrix).toMatchObject({
      month: '2026-10',
      monthLabel: 'October 2026',
      batchCode: 'B-MOR',
      batchName: 'Morning Elite',
      batchTime: '06:30 – 08:00',
      schedule: 'Mon, Wed, Fri',
      coaches: ['Coach Iyer', 'Coach Rao'],
    });
    expect(matrix.days).toHaveLength(31);
    expect(matrix.days[0]).toMatchObject({ date: '2026-10-01', day: 1, weekday: 'Thu', scheduled: false });
    expect(matrix.days[4]).toMatchObject({ date: '2026-10-05', day: 5, weekday: 'Mon', scheduled: true });

    const [aarav, diya] = matrix.rows;
    expect(aarav).toMatchObject({
      studentId: 's1',
      studentName: 'Aarav Patil',
      studentCode: 'TCA-1',
      present: 2,
      late: 1,
      absent: 1,
      checkedOut: 0,
      recorded: 4,
      attended: 3,
      percentage: 75,
    });
    expect(aarav.cells[0]).toBe('off'); // Thursday, not a session
    expect(aarav.cells[1]).toBe('not_recorded'); // Friday session, no mark
    expect(aarav.cells[4]).toBe('present');
    expect(aarav.cells[6]).toBe('late');
    expect(aarav.cells[8]).toBe('absent');
    expect(aarav.cells[13]).toBe('not_recorded'); // unknown status is not counted

    expect(diya).toMatchObject({
      studentId: 's2',
      present: 1,
      late: 0,
      absent: 0,
      checkedOut: 1,
      recorded: 2,
      attended: 2,
      percentage: 100,
    });
    expect(diya.cells[0]).toBe('not_enrolled');
    expect(diya.cells[13]).toBe('not_enrolled'); // Oct 14, before the enrolment started
    expect(diya.cells[15]).toBe('present');
    expect(diya.cells[18]).toBe('checked_out');

    const enrollment = tableRequest(requests, 'enrollments')!;
    expect(enrollment.searchParams.get('batch_id')).toBe('eq.b1');
    expect(enrollment.searchParams.get('status')).toBe('eq.active');
    expect(enrollment.searchParams.get('valid_from')).toBe('lte.2026-10-31');
    expect(enrollment.searchParams.get('or')).toContain('valid_till.gte.2026-10-01');
    const attendance = tableRequest(requests, 'attendance_records')!;
    expect(attendance.searchParams.get('batch_id')).toBe('eq.b1');
    expect(attendance.searchParams.get('attendance_date')).toBe('gte.2026-10-01');
  });

  it('treats a batch without schedule rows as every day and keeps unrecorded sessions null', async () => {
    setup(async (input) => {
      const url = new URL(String(input));
      const table = url.pathname.split('/').pop();
      if (table === 'batches') return response({ id: 'b1', name: 'Morning Elite' });
      if (table === 'batch_days') return response([]);
      if (table === 'batch_coaches') return response([]);
      if (table === 'enrollments') {
        return response(
          [
            {
              valid_from: '2026-10-01',
              valid_till: null,
              student: { id: 's1', full_name: 'Aarav Patil', student_code: 'TCA-1' },
            },
          ],
          200,
          1,
        );
      }
      return response([], 200, 0);
    });

    const matrix = await TestBed.inject(AttendanceService).matrix('b1', '2026-10');

    expect(matrix.schedule).toBe('Every day');
    expect(matrix.days.every((day) => day.scheduled)).toBe(true);
    expect(matrix.rows[0]).toMatchObject({
      recorded: 0,
      attended: 0,
      percentage: null,
    });
    expect(matrix.rows[0].cells.every((cell) => cell === 'not_recorded')).toBe(true);
  });

  it('keeps an open-ended enrolment open when the same student has a closed one', async () => {
    setup(async (input) => {
      const url = new URL(String(input));
      const table = url.pathname.split('/').pop();
      if (table === 'batches') return response({ id: 'b1', name: 'Morning Elite' });
      if (table === 'batch_days') return response([{ day_of_week: 1 }]);
      if (table === 'batch_coaches') return response([]);
      if (table === 'enrollments') {
        return response(
          [
            {
              valid_from: '2026-10-01',
              valid_till: '2026-10-10',
              student: { id: 's1', full_name: 'Aarav Patil', student_code: 'TCA-1' },
            },
            {
              valid_from: '2026-10-11',
              valid_till: null,
              student: { id: 's1', full_name: 'Aarav Patil', student_code: 'TCA-1' },
            },
          ],
          200,
          2,
        );
      }
      return response(
        [{ student_id: 's1', attendance_date: '2026-10-19', status: 'present' }],
        200,
        1,
      );
    });

    const matrix = await TestBed.inject(AttendanceService).matrix('b1', '2026-10');

    expect(matrix.rows).toHaveLength(1);
    expect(matrix.rows[0].cells[18]).toBe('present'); // Oct 19 is after the closed enrolment
    expect(matrix.rows[0].percentage).toBe(100);
  });

  it('rejects a missing batch or malformed month before querying', async () => {
    const fetch = vi.fn();
    setup(fetch);
    const service = TestBed.inject(AttendanceService);

    await expect(service.matrix('', '2026-10')).rejects.toThrow('Choose a batch');
    await expect(service.matrix('b1', '2026-13')).rejects.toThrow('valid month');
    await expect(service.matrix('b1', 'October 2026')).rejects.toThrow('valid month');
    expect(fetch).not.toHaveBeenCalled();
  });
});
