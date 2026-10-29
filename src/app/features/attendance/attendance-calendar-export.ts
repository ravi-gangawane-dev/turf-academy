import {
  AttendanceCalendarListResult,
  AttendanceCalendarStats,
} from '../../core/supabase/attendance-calendar.service';

export interface CalendarExportInput {
  readonly view: 'month' | 'week' | 'list';
  readonly monthLabel: string;
  readonly batchLabel: string;
  readonly studentLabel: string;
  readonly statusLabel: string;
  readonly dateRange?: string;
  readonly stats?: AttendanceCalendarStats;
  readonly list?: AttendanceCalendarListResult;
}

export function buildAttendanceCalendarCsv(input: CalendarExportInput): string {
  const rows: (string | number)[][] = [
    ['View', input.view],
    ['Month', input.monthLabel],
    ...(input.dateRange ? [['Date range', input.dateRange]] : []),
    ['Batch', input.batchLabel],
    ['Student', input.studentLabel],
    ['Status', input.statusLabel],
    [],
  ];
  if (input.view === 'list' && input.list) {
    rows.push([
      'Date',
      'Student',
      'Student code',
      'Batch',
      'Check in',
      'Check out',
      'Status',
      'Source',
      'Remarks',
    ]);
    rows.push(
      ...input.list.records.map((record) => [
        record.attendance_date,
        record.student?.full_name ?? '',
        record.student?.student_code ?? '',
        record.batch?.name ?? '',
        record.check_in_at ?? '',
        record.check_out_at ?? '',
        record.status,
        record.source ?? '',
        record.remarks ?? '',
      ]),
    );
  } else if (input.stats) {
    const percent = (value: number) =>
      input.stats!.total ? `${Math.round((value / input.stats!.total) * 100)}%` : '0%';
    rows.push(
      ['Status', 'Count', 'Percentage'],
      ['Present', input.stats.present, percent(input.stats.present)],
      ['Absent', input.stats.absent, percent(input.stats.absent)],
      ['Late', input.stats.late, percent(input.stats.late)],
      ['Checked Out', input.stats.checked_out, percent(input.stats.checked_out)],
      ['Total', input.stats.total, input.stats.total ? '100%' : '0%'],
    );
  } else return '';
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value);
          return `"${(/^[=+\-@]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\r\n');
}
