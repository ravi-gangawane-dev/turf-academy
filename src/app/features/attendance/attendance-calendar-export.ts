import {
  AttendanceCalendarListResult,
  AttendanceCalendarStats,
} from '../../core/supabase/attendance-calendar.service';
import { ExportColumn, ExportRow } from '../../shared/export/export.models';

export const calendarSummaryColumns: readonly ExportColumn[] = [
  { key: 'status', label: 'Status' },
  { key: 'count', label: 'Count', align: 'right' },
  { key: 'percentage', label: 'Percentage', align: 'right' },
];

export const calendarRecordColumns: readonly ExportColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'student', label: 'Student' },
  { key: 'studentCode', label: 'Student code' },
  { key: 'batch', label: 'Batch' },
  { key: 'checkIn', label: 'Check in' },
  { key: 'checkOut', label: 'Check out' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'remarks', label: 'Remarks' },
];

/** Status totals for the selected month or week, shaped for the shared export path. */
export function buildSummaryExportRows(stats?: AttendanceCalendarStats): readonly ExportRow[] {
  if (!stats) return [];
  const percent = (value: number) =>
    stats.total ? `${Math.round((value / stats.total) * 100)}%` : '0%';
  return [
    { status: 'Present', count: stats.present, percentage: percent(stats.present) },
    { status: 'Absent', count: stats.absent, percentage: percent(stats.absent) },
    { status: 'Late', count: stats.late, percentage: percent(stats.late) },
    { status: 'Checked Out', count: stats.checked_out, percentage: percent(stats.checked_out) },
    { status: 'Total', count: stats.total, percentage: stats.total ? '100%' : '0%' },
  ];
}

/** Record rows keep empty values empty instead of substituting placeholders. */
export function buildRecordExportRows(
  records: AttendanceCalendarListResult['records'],
): readonly ExportRow[] {
  return records.map((record) => ({
    date: record.attendance_date,
    student: record.student?.full_name ?? '',
    studentCode: record.student?.student_code ?? '',
    batch: record.batch?.name ?? '',
    checkIn: record.check_in_at ?? '',
    checkOut: record.check_out_at ?? '',
    status: record.status,
    source: record.source ?? '',
    remarks: record.remarks ?? '',
  }));
}
