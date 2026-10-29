import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './database.service';
import { AttendanceHistoryRecord } from './domain-services';
import { API_CONFIG } from '../config/api.config';
import { AcademyStore } from '../state/academy.store';
import { attendanceTimestamp } from './attendance-timestamp';

export interface AttendanceCalendarListResult {
  records: readonly (Omit<AttendanceHistoryRecord, 'student'> & {
    student:
      (NonNullable<AttendanceHistoryRecord['student']> & { photo_url?: string | null }) | null;
  })[];
  total: number;
  page: number;
  pageSize: number;
}
export interface AttendanceDateRange {
  readonly from: string;
  readonly to: string;
}
export interface AttendanceCalendarStats {
  present: number;
  absent: number;
  late: number;
  checked_out: number;
  total: number;
}
export interface AttendanceCalendarDay {
  day: number;
  muted: boolean;
  inRange?: boolean;
  stats?: AttendanceCalendarStats;
  isHoliday?: boolean;
}
export interface AttendanceCalendarResult {
  year: number;
  month: number;
  days: readonly AttendanceCalendarDay[];
  monthStats: AttendanceCalendarStats;
  dates: { from: string; to: string };
}
export interface AttendanceCalendarWeekResult {
  week: number;
  startDate: string;
  endDate: string;
  dayStats: readonly (AttendanceCalendarDay & { date: string; stats: AttendanceCalendarStats })[];
  weekStats: AttendanceCalendarStats;
}
const emptyStats = (): AttendanceCalendarStats => ({
  present: 0,
  absent: 0,
  late: 0,
  checked_out: 0,
  total: 0,
});
// Calendar dates are civil dates, not instants: avoid shifting them with UTC conversion.
export const calendarDate = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

@Injectable({ providedIn: 'root' })
export class AttendanceCalendarService {
  private readonly db = inject(DatabaseService);
  private readonly mock = inject(API_CONFIG).useMockApi;
  private readonly store = inject(AcademyStore);

  private mockRows(
    from: string,
    to: string,
    batchId?: string,
    studentId?: string,
    status?: string,
  ): AttendanceHistoryRecord[] {
    return this.store
      .attendance()
      .filter(
        (row) =>
          row.businessDate >= from &&
          row.businessDate <= to &&
          (!batchId || row.batchId === batchId) &&
          (!studentId || row.studentId === studentId) &&
          (!status || status === 'all' || row.status.replace('-', '_') === status),
      )
      .map((row) => ({
        id: row.id,
        attendance_date: row.businessDate,
        check_in_at: attendanceTimestamp(row.businessDate, row.checkInAt),
        check_out_at: attendanceTimestamp(row.businessDate, row.checkOutAt),
        status: row.status.replace('-', '_'),
        source: 'manual',
        remarks: null,
        student: {
          id: row.studentId,
          student_code: row.studentId,
          full_name: this.store.students().find((s) => s.id === row.studentId)?.name ?? '',
        },
        batch: {
          id: row.batchId,
          name: this.store.batches().find((b) => b.id === row.batchId)?.name ?? '',
        },
      }))
      .sort(
        (a, b) => b.attendance_date.localeCompare(a.attendance_date) || a.id.localeCompare(b.id),
      );
  }

  private query(
    from: string,
    to: string,
    columns: string,
    batchId?: string,
    studentId?: string,
    status?: string,
  ) {
    let query = this.db.client
      .from('attendance_records')
      .select(columns, { count: 'exact' })
      .gte('attendance_date', from)
      .lte('attendance_date', to);
    if (batchId) query = query.eq('batch_id', batchId);
    if (studentId) query = query.eq('student_id', studentId);
    if (status && status !== 'all') query = query.eq('status', status);
    return query.order('attendance_date', { ascending: false }).order('id');
  }

  async getMonthStats(
    year: number,
    month: number,
    batchId?: string,
    studentId?: string,
    status?: string,
    dateRange?: AttendanceDateRange,
  ): Promise<AttendanceCalendarResult> {
    const lastDay = new Date(year, month, 0).getDate();
    const monthFrom = calendarDate(year, month, 1),
      monthTo = calendarDate(year, month, lastDay);
    const from = dateRange?.from ?? monthFrom;
    const to = dateRange?.to ?? monthTo;
    const hasDateRange = from <= to;
    const byDay = new Map<string, AttendanceCalendarStats>();
    const monthStats = emptyStats();
    if (this.mock && hasDateRange) {
      for (const row of this.mockRows(from, to, batchId, studentId, status)) {
        const date = row.attendance_date;
        const stats = byDay.get(date) ?? emptyStats();
        const key = row.status as keyof Omit<AttendanceCalendarStats, 'total'>;
        if (['present', 'absent', 'late', 'checked_out'].includes(key)) {
          stats[key]++;
          stats.total++;
          monthStats[key]++;
          monthStats.total++;
        }
        byDay.set(date, stats);
      }
    } else if (!this.mock && hasDateRange) {
      // Server-grouped counts (get_attendance_day_stats): one query instead of
      // downloading every attendance row in the range and grouping in the browser.
      const result = await this.db.client.rpc('get_attendance_day_stats', {
        p_from: from,
        p_to: to,
        p_batch_id: batchId ?? null,
        p_student_id: studentId ?? null,
        p_status: status ?? null,
      });
      const rows = this.db.unwrap('Load attendance calendar', result) as readonly {
        day: string;
        present: number;
        absent: number;
        late: number;
        checked_out: number;
        total: number;
      }[];
      for (const row of rows) {
        byDay.set(row.day, {
          present: row.present,
          absent: row.absent,
          late: row.late,
          checked_out: row.checked_out,
          total: row.total,
        });
        monthStats.present += row.present;
        monthStats.absent += row.absent;
        monthStats.late += row.late;
        monthStats.checked_out += row.checked_out;
        monthStats.total += row.total;
      }
    }
    const days: AttendanceCalendarDay[] = [];
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const previousLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const day = previousLastDay - i;
      const date = calendarDate(year, month - 1 || 12, day);
      days.push({ day, muted: true, inRange: hasDateRange && date >= from && date <= to });
    }
    for (let day = 1; day <= lastDay; day++) {
      const date = calendarDate(year, month, day);
      days.push({
        day,
        muted: false,
        inRange: hasDateRange && date >= from && date <= to,
        stats: byDay.get(date) ?? emptyStats(),
      });
    }
    for (let day = 1; days.length < 42; day++) {
      const date = calendarDate(year, month + 1, day);
      days.push({ day, muted: true, inRange: hasDateRange && date >= from && date <= to });
    }
    return { year, month, days, monthStats, dates: { from, to } };
  }

  async getWeekStats(
    year: number,
    month: number,
    weekOfMonth: number,
    batchId?: string,
    studentId?: string,
    status?: string,
    dateRange?: AttendanceDateRange,
  ): Promise<AttendanceCalendarWeekResult> {
    const data = await this.getMonthStats(year, month, batchId, studentId, status, dateRange);
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const lastDay = new Date(year, month, 0).getDate();
    const week = Math.max(1, Math.min(weekOfMonth, Math.ceil((firstWeekday + lastDay) / 7)));
    const fromDay = Math.max(1, (week - 1) * 7 - firstWeekday + 1);
    const toDay = Math.min(lastDay, week * 7 - firstWeekday);
    const dayStats = data.days
      .filter(
        (day) =>
          !day.muted &&
          day.day >= fromDay &&
          day.day <= toDay &&
          day.inRange !== false,
      )
      .map((day) => ({ ...day, date: calendarDate(year, month, day.day), stats: day.stats! }));
    const weekStats = emptyStats();
    for (const day of dayStats)
      for (const key of Object.keys(weekStats) as (keyof AttendanceCalendarStats)[])
        weekStats[key] += day.stats[key];
    return {
      week,
      startDate: calendarDate(year, month, fromDay),
      endDate: calendarDate(year, month, toDay),
      dayStats,
      weekStats,
    };
  }

  async getListView(
    year: number,
    month: number,
    batchId?: string,
    studentId?: string,
    status?: string,
    page = 1,
    pageSize = 50,
    dateRange?: AttendanceDateRange,
  ): Promise<AttendanceCalendarListResult> {
    const from = dateRange?.from ?? calendarDate(year, month, 1);
    const to = dateRange?.to ?? calendarDate(year, month, new Date(year, month, 0).getDate());
    if (from > to) return { records: [], total: 0, page, pageSize };
    const start = Math.max(0, (page - 1) * pageSize);
    if (this.mock) {
      const rows = this.mockRows(from, to, batchId, studentId, status);
      return { records: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
    }
    const result = await this.query(
      from,
      to,
      'id,attendance_date,check_in_at,check_out_at,status,remarks,source,student:students(id,student_code,full_name,photo_url),batch:batches(id,code,name)',
      batchId,
      studentId,
      status,
    ).range(start, start + pageSize - 1);
    const records = this.db.unwrap(
      'Load attendance list',
      result,
    ) as unknown as AttendanceCalendarListResult['records'];
    return { records, total: result.count ?? 0, page, pageSize };
  }
}
