import { TestBed } from '@angular/core/testing';
import { AttendanceCalendarService } from './attendance-calendar.service';
import { DatabaseService } from './database.service';
import { API_CONFIG } from '../config/api.config';
import { AcademyStore } from '../state/academy.store';

const unwrap = <T>(_operation: string, result: { data: T | null; error: unknown }): T => {
  if (result.error) throw new Error('Load failed');
  return result.data as T;
};

describe('Attendance calendar dates and complete summaries', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('requests server-grouped day stats with scope and maps them into month and week views', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { day: '2026-10-01', present: 1, absent: 1, late: 1, checked_out: 1, total: 4 },
        { day: '2026-10-15', present: 0, absent: 0, late: 2, checked_out: 0, total: 2 },
        { day: '2026-10-31', present: 0, absent: 0, late: 2, checked_out: 0, total: 2 },
      ],
      error: null,
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: DatabaseService, useValue: { client: { rpc }, unwrap } },
        { provide: API_CONFIG, useValue: { useMockApi: false } },
        { provide: AcademyStore, useValue: {} },
      ],
    });
    const service = TestBed.inject(AttendanceCalendarService);
    const month = await service.getMonthStats(2026, 10, 'b1', 's1', 'late');
    expect(month.dates).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(rpc).toHaveBeenCalledWith('get_attendance_day_stats', {
      p_from: '2026-10-01',
      p_to: '2026-10-31',
      p_batch_id: 'b1',
      p_student_id: 's1',
      p_status: 'late',
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(month.monthStats).toEqual({
      present: 1,
      absent: 1,
      late: 5,
      checked_out: 1,
      total: 8,
    });
    expect(month.days.find((day) => !day.muted && day.day === 15)?.stats?.late).toBe(2);
    // Days without records keep zeroed stats and the civil grid stays 42 cells.
    expect(month.days.find((day) => !day.muted && day.day === 16)?.stats?.total).toBe(0);
    expect(month.days).toHaveLength(42);
    const week = await service.getWeekStats(2026, 10, 5, 'b1', 's1', 'late');
    expect(week.startDate).toBe('2026-10-25');
    expect(week.endDate).toBe('2026-10-31');
    expect(week.weekStats.total).toBe(2);
  });

  it('limits monthly results to a custom range and marks days outside the range', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { day: '2026-10-10', present: 2, absent: 0, late: 0, checked_out: 0, total: 2 },
        { day: '2026-10-15', present: 1, absent: 0, late: 0, checked_out: 0, total: 1 },
      ],
      error: null,
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: DatabaseService, useValue: { client: { rpc }, unwrap } },
        { provide: API_CONFIG, useValue: { useMockApi: false } },
        { provide: AcademyStore, useValue: {} },
      ],
    });
    const service = TestBed.inject(AttendanceCalendarService);
    const month = await service.getMonthStats(2026, 10, undefined, undefined, undefined, {
      from: '2026-10-10',
      to: '2026-10-15',
    });
    expect(rpc).toHaveBeenCalledWith('get_attendance_day_stats', {
      p_from: '2026-10-10',
      p_to: '2026-10-15',
      p_batch_id: null,
      p_student_id: null,
      p_status: null,
    });
    expect(month.monthStats.total).toBe(3);
    expect(month.days.find((day) => day.day === 9)?.inRange).toBe(false);
    expect(month.days.find((day) => day.day === 10)?.inRange).toBe(true);
    expect(month.days.find((day) => day.day === 15)?.inRange).toBe(true);
    const week = await service.getWeekStats(2026, 10, 2, undefined, undefined, undefined, {
      from: '2026-10-10',
      to: '2026-10-15',
    });
    expect(week.dayStats.map((day) => day.date)).toEqual(['2026-10-10']);
    expect(week.weekStats.total).toBe(2);
  });

  it('propagates stats load failures through the request boundary', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DatabaseService,
          useValue: {
            client: { rpc },
            unwrap: (operation: string, result: { data: unknown; error: unknown }) => {
              if (result.error) throw new Error('This request could not be completed.');
              return result.data;
            },
          },
        },
        { provide: API_CONFIG, useValue: { useMockApi: false } },
        { provide: AcademyStore, useValue: {} },
      ],
    });
    const service = TestBed.inject(AttendanceCalendarService);
    await expect(service.getMonthStats(2026, 10)).rejects.toThrow(
      'This request could not be completed.',
    );
  });

  it('keeps grouping in mock mode without touching the server', async () => {
    const rpc = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: DatabaseService, useValue: { client: { rpc }, unwrap } },
        { provide: API_CONFIG, useValue: { useMockApi: true } },
        {
          provide: AcademyStore,
          useValue: {
            attendance: () => [
              {
                id: 'a1',
                studentId: 's1',
                batchId: 'b1',
                businessDate: '2026-10-03',
                checkInAt: '07:00:00',
                checkOutAt: '',
                status: 'present',
              },
              {
                id: 'a2',
                studentId: 's1',
                batchId: 'b1',
                businessDate: '2026-10-03',
                checkInAt: '07:00:00',
                checkOutAt: '08:00:00',
                status: 'checked-out',
              },
              {
                id: 'a3',
                studentId: 's2',
                batchId: 'b1',
                businessDate: '2026-10-03',
                checkInAt: '',
                checkOutAt: '',
                status: 'absent',
              },
            ],
            students: () => [
              { id: 's1', name: 'One' },
              { id: 's2', name: 'Two' },
            ],
            batches: () => [{ id: 'b1', name: 'Batch A' }],
          },
        },
      ],
    });
    const service = TestBed.inject(AttendanceCalendarService);
    const month = await service.getMonthStats(2026, 10);
    expect(rpc).not.toHaveBeenCalled();
    expect(month.monthStats).toEqual({
      present: 1,
      absent: 1,
      late: 0,
      checked_out: 1,
      total: 3,
    });
    expect(month.days.find((day) => !day.muted && day.day === 3)?.stats).toEqual({
      present: 1,
      absent: 1,
      late: 0,
      checked_out: 1,
      total: 3,
    });
    // October 2026 starts on a Thursday, so week 1 spans days 1–3.
    const week = await service.getWeekStats(2026, 10, 1);
    expect(week.startDate).toBe('2026-10-01');
    expect(week.endDate).toBe('2026-10-03');
    expect(week.weekStats.total).toBe(3);
  });
});
