import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { SupabaseAttendanceRepository } from './supabase-attendance.repository';

interface Result { data: unknown; error: unknown }

function query(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'lte', 'or', 'not', 'limit', 'order', 'range'])
    builder[method] = () => builder;
  builder['maybeSingle'] = () => Promise.resolve(result);
  builder['then'] = (resolve: (value: Result) => void, reject: (reason: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

function workspaceRow(overrides: Record<string, unknown> = {}) {
  return {
    enrollment_id: 'e1',
    student_id: 's1',
    student_name: 'Rohan Patil',
    student_date_of_birth: '2012-05-14',
    student_skill_level: 'Intermediate',
    student_status: 'active',
    batch_id: 'b1',
    batch_name: 'U14 Morning',
    batch_capacity: 20,
    batch_start_time: '07:00:00',
    batch_end_time: '08:00:00',
    monthly_fee: 1250,
    valid_from: '2026-01-01',
    valid_till: null,
    attendance_id: null,
    check_in_at: null,
    check_out_at: null,
    attendance_status: null,
    total: 3,
    ...overrides,
  };
}

describe('Supabase attendance workspace queries', () => {
  let client: { rpc: ReturnType<typeof vi.fn>; from: ReturnType<typeof vi.fn> };
  let repository: SupabaseAttendanceRepository;

  beforeEach(() => {
    client = { rpc: vi.fn(), from: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseClientService, useValue: { requireClient: () => client } },
        SupabaseAttendanceRepository,
      ],
    });
    repository = TestBed.inject(SupabaseAttendanceRepository);
  });

  it('loads the workspace from one bounded RPC page instead of scanning every enrollment page', async () => {
    client.rpc.mockResolvedValue({
      data: [
        workspaceRow(),
        workspaceRow({
          enrollment_id: 'e2',
          attendance_id: 'a1',
          attendance_status: 'checked_out',
          check_in_at: '2026-10-19T07:02:00+00:00',
          check_out_at: '2026-10-19T08:01:00+00:00',
        }),
      ],
      error: null,
    });
    const workspace = await repository.workspace();
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('get_attendance_workspace_page', {
      p_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      p_limit: 500,
      p_offset: 0,
    });
    expect(client.from).not.toHaveBeenCalled();
    expect(workspace.students).toEqual([
      expect.objectContaining({ id: 's1', name: 'Rohan Patil', dateOfBirth: '2012-05-14' }),
    ]);
    expect(workspace.batches).toEqual([
      expect.objectContaining({ id: 'b1', name: 'U14 Morning', schedule: '07:00:00 – 08:00:00' }),
    ]);
    expect(workspace.enrollments).toHaveLength(2);
    expect(workspace.enrollments[0]).toMatchObject({
      monthlyFeePaise: 125000,
      startDate: '2026-01-01',
      dueDate: '',
      status: 'active',
    });
    expect(workspace.attendance).toEqual([
      expect.objectContaining({
        id: 'a1',
        studentId: 's1',
        status: 'checked-out',
        checkInAt: '2026-10-19T07:02:00+00:00',
      }),
    ]);
  });

  it('maps rows without attendance into unmarked records rather than fabricating check-ins', async () => {
    client.rpc.mockResolvedValue({ data: [workspaceRow()], error: null });
    const workspace = await repository.workspace();
    expect(workspace.attendance).toEqual([]);
  });

  it('surfaces workspace load failures as safe request errors without leaking provider details', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    const failure: Error | null = await repository.workspace().then(
      () => null,
      (reason: unknown) => (reason instanceof Error ? reason : new Error(String(reason))),
    );
    expect(failure).toBeInstanceOf(Error);
    expect(failure?.message).toContain('This request could not be completed.');
    expect(failure?.message).not.toContain('permission denied');
  });

  describe('identifyQr targeted reads', () => {
    const today = new Date().toISOString().slice(0, 10);
    const studentRow = {
      id: 's1',
      full_name: 'Rohan Patil',
      date_of_birth: '2012-05-14',
      skill_level: 'Intermediate',
      status: 'active',
    };
    const enrollmentRow = {
      id: 'e1',
      student_id: 's1',
      batch_id: 'b1',
      valid_from: '2026-01-01',
      valid_till: null,
      monthly_fee: 1250,
      batch: {
        id: 'b1',
        name: 'U14 Morning',
        capacity: 20,
        start_time: '07:00:00',
        end_time: '08:00:00',
      },
    };

    function stubTables(tables: Record<string, Result>) {
      client.from.mockImplementation((table: string) => {
        if (!(table in tables)) throw new Error(`Unexpected table read: ${table}`);
        return query(tables[table]);
      });
    }

    it('resolves one student without downloading the whole workspace', async () => {
      stubTables({
        qr_profiles: { data: { student_id: 's1' }, error: null },
        students: { data: studentRow, error: null },
        enrollments: { data: [enrollmentRow], error: null },
        attendance_records: {
          data: {
            id: 'a1',
            student_id: 's1',
            batch_id: 'b1',
            attendance_date: today,
            check_in_at: `${today}T07:02:00+00:00`,
            check_out_at: null,
            status: 'present',
          },
          error: null,
        },
      });
      const identity = await repository.identifyQr('tok-1');
      expect(client.rpc).not.toHaveBeenCalled();
      expect(identity.student).toMatchObject({ id: 's1', name: 'Rohan Patil' });
      expect(identity.enrollment).toMatchObject({ id: 'e1', monthlyFeePaise: 125000 });
      expect(identity.batch).toMatchObject({ id: 'b1', schedule: '07:00:00 – 08:00:00' });
      expect(identity.attendance).toMatchObject({ id: 'a1', status: 'present' });
    });

    it('rejects inactive or unknown tokens', async () => {
      stubTables({ qr_profiles: { data: null, error: null } });
      await expect(repository.identifyQr('bad-token')).rejects.toThrow(
        'QR code is invalid or inactive.',
      );
    });

    it('flags students enrolled in multiple active batches', async () => {
      stubTables({
        qr_profiles: { data: { student_id: 's1' }, error: null },
        students: { data: studentRow, error: null },
        enrollments: {
          data: [enrollmentRow, { ...enrollmentRow, id: 'e2', batch_id: 'b2' }],
          error: null,
        },
      });
      await expect(repository.identifyQr('tok-1')).rejects.toThrow(
        'Student has multiple active batches. Select the batch on the manual attendance page.',
      );
    });

    it('reports students without an active enrollment', async () => {
      stubTables({
        qr_profiles: { data: { student_id: 's1' }, error: null },
        students: { data: studentRow, error: null },
        enrollments: { data: [], error: null },
      });
      await expect(repository.identifyQr('tok-1')).rejects.toThrow(
        'Student has no active enrollment.',
      );
    });

    it('leaves attendance undefined when the student has not checked in today', async () => {
      stubTables({
        qr_profiles: { data: { student_id: 's1' }, error: null },
        students: { data: studentRow, error: null },
        enrollments: { data: [enrollmentRow], error: null },
        attendance_records: { data: null, error: null },
      });
      const identity = await repository.identifyQr('tok-1');
      expect(identity.attendance).toBeUndefined();
    });
  });
});
