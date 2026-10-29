import { buildAttendanceCalendarCsv } from './attendance-calendar-export';

describe('buildAttendanceCalendarCsv', () => {
  const stats = { present: 8, absent: 1, late: 1, checked_out: 0, total: 10 };
  it('exports month summary and active filters', () => {
    const csv = buildAttendanceCalendarCsv({ view: 'month', monthLabel: 'September 2026', batchLabel: 'U16', studentLabel: 'All students', statusLabel: 'present', stats });
    expect(csv).toContain('"Batch","U16"'); expect(csv).toContain('"Present","8","80%"');
  });
  it('exports the selected week range', () => {
    const csv = buildAttendanceCalendarCsv({ view: 'week', monthLabel: 'September 2026', batchLabel: 'All batches', studentLabel: 'All students', statusLabel: 'All statuses', dateRange: '2026-09-06 to 2026-09-12', stats });
    expect(csv).toContain('"Date range","2026-09-06 to 2026-09-12"');
  });
  it('exports list records without fallback values', () => {
    const csv = buildAttendanceCalendarCsv({ view: 'list', monthLabel: 'September 2026', batchLabel: 'U16', studentLabel: 'Asha', statusLabel: 'late', list: { total: 1, page: 1, pageSize: 50, records: [{ id: 'a', attendance_date: '2026-09-10', check_in_at: null, check_out_at: null, status: 'late', remarks: null, source: 'manual', student: { id: 's', student_code: 'S1', full_name: 'Asha', photo_url: null }, batch: { id: 'b', name: 'U16' } }] } });
    expect(csv).toContain('"2026-09-10","Asha","S1","U16","","","late"');
  });
});
