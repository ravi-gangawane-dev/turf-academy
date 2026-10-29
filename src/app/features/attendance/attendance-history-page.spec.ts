import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AttendanceHistoryPage } from './attendance-history-page';
import {
  AttendanceService,
  BatchesService,
  StudentsService,
  AttendanceHistoryRecord,
} from '../../core/supabase/domain-services';
import { AcademyFacade } from '../../core/state/academy.facade';
import { API_CONFIG } from '../../core/config/api.config';

const record: AttendanceHistoryRecord = {
  id: 'a1',
  attendance_date: '2026-10-15',
  check_in_at: null,
  check_out_at: null,
  status: 'absent',
  source: 'manual',
  remarks: '=UNSAFE()',
  student: { id: 's1', full_name: 'Student One', student_code: 'S1' },
  batch: { id: 'b1', name: 'Morning' },
};
function setup() {
  const attendance = {
    history: vi.fn().mockResolvedValue({ rows: [record], total: 101 }),
    correctionPage: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1 }),
    correct: vi.fn().mockResolvedValue(null),
  };
  const students = {
    list: vi
      .fn()
      .mockResolvedValue({ data: [{ id: 's1', full_name: 'Student One' }], count: 1, error: null }),
  };
  const batches = {
    list: vi.fn().mockResolvedValue([{ id: 'b1', name: 'Morning' }]),
  };
  TestBed.configureTestingModule({
    imports: [AttendanceHistoryPage],
    providers: [
      provideRouter([]),
      { provide: AttendanceService, useValue: attendance },
      { provide: StudentsService, useValue: students },
      { provide: BatchesService, useValue: batches },
      { provide: API_CONFIG, useValue: { useMockApi: false } },
      { provide: AcademyFacade, useValue: { students: signal([]), batches: signal([]), attendance: signal([]) } },
    ],
  });
  const fixture = TestBed.createComponent(AttendanceHistoryPage);
  return { fixture, component: fixture.componentInstance, attendance };
}
const selection = (value: string) => ({ target: { value } }) as unknown as Event;
describe('Attendance history', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });
  it('loads once, forwards filters before pagination, and uses the server total', async () => {
    const { fixture, component, attendance } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(attendance.history).toHaveBeenCalledTimes(1);
    await vi.waitFor(() =>
      expect(component['allStudents']()).toEqual([{ id: 's1', name: 'Student One' }]),
    );
    component['onPageChange'](3);
    fixture.detectChanges();
    await fixture.whenStable();
    component['onStudentChange'](selection('s1'));
    component['onStatusChange'](selection('absent'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(attendance.history).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      1,
      50,
      { studentId: 's1', status: 'absent' },
    );
    expect(component['total']()).toBe(101);
    component['onPageSizeChange'](10);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(attendance.history).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      1,
      10,
      { studentId: 's1', status: 'absent' },
    );
  });
  it('ignores a stale response and clears stale rows after a failed query', async () => {
    const { component, attendance } = setup();
    let resolveOld!: (value: { rows: AttendanceHistoryRecord[]; total: number }) => void;
    attendance.history.mockImplementationOnce(
      () => new Promise((resolve) => (resolveOld = resolve)),
    );
    const old = component['loadAttendanceHistory']();
    await component['loadAttendanceHistory']();
    resolveOld({ rows: [], total: 0 });
    await old;
    expect(component['total']()).toBe(101);
    attendance.history.mockRejectedValueOnce(new Error('Read failed'));
    await component['loadAttendanceHistory']();
    expect(component['records']()).toEqual([]);
    expect(component['total']()).toBe(0);
    expect(component['error']()).toBe('Read failed');
  });
  it('keeps the primary filters compact and reveals advanced filters on demand', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const actions = fixture.nativeElement.querySelector(
      'app-table-tools .table-tools-actions',
    ) as HTMLElement;
    const filters = actions.querySelector('.table-filters') as HTMLElement;
    const advanced = filters.querySelector('.filter-advanced') as HTMLElement;
    const moreFilters = filters.querySelector('.more-filters') as HTMLButtonElement;

    expect(filters).not.toBeNull();
    expect(filters.querySelectorAll('.filter-main label').length).toBe(2);
    expect(advanced.hidden).toBe(true);
    expect(moreFilters.textContent).toContain('More filters');
    expect(filters.querySelector('.clear-filters')?.textContent).toContain('Clear all filters');

    moreFilters.click();
    fixture.detectChanges();

    expect(advanced.hidden).toBe(false);
    expect(moreFilters.getAttribute('aria-expanded')).toBe('true');
    expect(moreFilters.textContent).toContain('Fewer filters');
    expect(advanced.querySelectorAll('label').length).toBe(4);

    const labels = [...actions.querySelectorAll('button')].map((button) =>
      button.textContent!.replace(/\s+/g, ' ').trim(),
    );
    expect(labels).toEqual([
      'Fewer filters',
      'Clear all filters',
      'Today',
      '7 Days',
      '30 Days',
      'Export page',
    ]);
    expect(
      filters.compareDocumentPosition(advanced.querySelector('.range-presets')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps the filters available when no records match', async () => {
    const { fixture, attendance } = setup();
    attendance.history.mockResolvedValue({ rows: [], total: 0 });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.table-filters')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('.records app-async-state')?.textContent,
    ).toContain('No attendance records match these filters.');
  });

  it('renders records with a correction action that fills the form', async () => {
    const { fixture, component } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() =>
      expect(component['allStudents']()).toEqual([{ id: 's1', name: 'Student One' }]),
    );
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.records tbody tr') as HTMLElement;
    expect(row.textContent).toContain('Student One');
    expect(row.textContent).toContain('Morning');

    row.querySelector<HTMLButtonElement>('.row-action')!.click();
    fixture.detectChanges();

    expect(component['draft']()).toMatchObject({ recordId: 'a1', studentId: 's1' });
    const studentSelect = fixture.nativeElement.querySelector('.correction-form select') as HTMLSelectElement;
    expect(studentSelect.value).toBe('s1');
  });

  it('loads a row into the correction form with its current values', async () => {
    const { component } = setup();
    component['startCorrection'](record);
    expect(component['draft']()).toMatchObject({
      studentId: 's1',
      date: '2026-10-15',
      recordId: 'a1',
      batchName: 'Morning',
      status: 'absent',
    });
  });

  it('requires a reason and an existing record before saving a correction', async () => {
    const { component, attendance } = setup();
    component['draft'].set({ studentId: 's1', date: '2026-10-15', recordId: '', batchName: '', status: 'present', checkIn: '', checkOut: '', reason: 'Wrong status' });
    await component['saveCorrection']();
    expect(attendance.correct).not.toHaveBeenCalled();
    expect(component['draftError']()).toContain('existing attendance record');

    component['draft'].set({ studentId: 's1', date: '2026-10-15', recordId: 'a1', batchName: 'Morning', status: 'present', checkIn: '', checkOut: '', reason: '  ' });
    await component['saveCorrection']();
    expect(attendance.correct).not.toHaveBeenCalled();
    expect(component['draftError']()).toContain('at least 3 characters');
  });

  it('saves a correction with the reason and reloads the table', async () => {
    const { component, attendance } = setup();
    component['draft'].set({
      studentId: 's1',
      date: '2026-10-15',
      recordId: 'a1',
      batchName: 'Morning',
      status: 'present',
      checkIn: '09:15',
      checkOut: '',
      reason: 'Check-in was recorded late',
    });
    await component['saveCorrection']();
    expect(attendance.correct).toHaveBeenCalledWith(
      'a1',
      {
        status: 'present',
        check_in_at: new Date('2026-10-15T09:15:00').toISOString(),
        check_out_at: null,
      },
      'Check-in was recorded late',
    );
    expect(component['draft']().reason).toBe('');
  });

  it('exports the page through the shared table export action', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    let csvBlob!: Blob;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      csvBlob = blob as Blob;
      return 'blob:test';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const exportButton = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Export page'),
    ) as HTMLButtonElement;
    expect(exportButton.disabled).toBe(false);
    exportButton.click();
    await fixture.whenStable();

    const csv = await csvBlob.text();
    expect(csv).toContain('Morning');
    expect(csv).toContain("'=UNSAFE()");
  });
});
