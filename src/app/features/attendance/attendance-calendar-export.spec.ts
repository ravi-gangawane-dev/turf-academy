import { tableCsv } from '../../shared/export/export-file';
import {
  buildRecordExportRows,
  buildSummaryExportRows,
  calendarRecordColumns,
  calendarSummaryColumns,
} from './attendance-calendar-export';

describe('attendance calendar export rows', () => {
  const stats = { present: 8, absent: 1, late: 1, checked_out: 0, total: 10 };

  it('builds month and week status totals with percentages', () => {
    const rows = buildSummaryExportRows(stats);
    expect(rows).toContainEqual({ status: 'Present', count: 8, percentage: '80%' });
    expect(rows).toContainEqual({ status: 'Total', count: 10, percentage: '100%' });
  });

  it('returns no summary rows when the selected period has no stats', () => {
    expect(buildSummaryExportRows()).toEqual([]);
  });

  it('keeps record values empty instead of substituting placeholders', () => {
    const rows = buildRecordExportRows([
      {
        id: 'a',
        attendance_date: '2026-09-10',
        check_in_at: null,
        check_out_at: null,
        status: 'late',
        remarks: null,
        source: 'manual',
        student: { id: 's', student_code: 'S1', full_name: 'Asha', photo_url: null },
        batch: { id: 'b', name: 'U16' },
      },
    ]);
    expect(rows[0]).toEqual({
      date: '2026-09-10',
      student: 'Asha',
      studentCode: 'S1',
      batch: 'U16',
      checkIn: '',
      checkOut: '',
      status: 'late',
      source: 'manual',
      remarks: '',
    });
  });

  it('escapes spreadsheet formulas through the shared CSV path', () => {
    const rows = buildRecordExportRows([
      {
        id: 'a',
        attendance_date: '2026-09-10',
        check_in_at: null,
        check_out_at: null,
        status: 'present',
        remarks: '=HYPERLINK("http://evil")',
        source: 'manual',
        student: { id: 's', student_code: 'S1', full_name: '+Asha', photo_url: null },
        batch: { id: 'b', name: 'U16' },
      },
    ]);
    const csv = tableCsv(calendarRecordColumns, rows);
    expect(csv).toContain('"\'+Asha"');
    expect(csv).toContain('"\'=HYPERLINK(""http://evil"")"');
  });

  it('uses the shared CSV builder for summary headers', () => {
    expect(tableCsv(calendarSummaryColumns, buildSummaryExportRows(stats)).split('\r\n')[0]).toBe(
      '"Status","Count","Percentage"',
    );
  });

  it('keeps the summary and record column labels in sync with the exported keys', () => {
    expect(calendarSummaryColumns.map((column) => column.key)).toEqual([
      'status',
      'count',
      'percentage',
    ]);
    expect(calendarRecordColumns.map((column) => column.label)).toEqual([
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
  });
});
