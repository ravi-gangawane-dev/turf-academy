import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AttendanceHistoryPage } from './attendance-history-page';
import {
  AttendanceService,
  AttendanceMatrixRecord,
  AttendanceRegisterRecord,
  BatchesService,
  StudentsService,
  AttendanceHistoryRecord,
} from '../../core/supabase/domain-services';
import { AcademyFacade } from '../../core/state/academy.facade';
import { API_CONFIG } from '../../core/config/api.config';
import { AuthService } from '../../core/auth/auth.service';
import { PrintDocumentService } from '../../shared/print/print-document.service';

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
const registerRecord: AttendanceRegisterRecord = {
  date: '2026-10-15',
  batchId: 'b1',
  batchCode: 'B-MOR',
  batchName: 'Morning Elite',
  batchTime: '06:30 – 08:00',
  coaches: ['Coach Rao'],
  rows: [
    {
      studentId: 's1',
      studentCode: 'S1',
      studentName: 'Student One',
      status: 'present',
      checkInAt: '2026-10-15T01:00:00Z',
      checkOutAt: null,
      remarks: 'On time',
      source: 'manual',
    },
    {
      studentId: 's2',
      studentCode: 'S2',
      studentName: 'Student Two',
      status: 'not_recorded',
      checkInAt: null,
      checkOutAt: null,
      remarks: null,
      source: null,
    },
  ],
  counts: { expected: 2, present: 1, late: 0, absent: 0, checkedOut: 0, notRecorded: 1 },
};
const matrixRecord: AttendanceMatrixRecord = {
  month: '2026-10',
  monthLabel: 'October 2026',
  batchId: 'b1',
  batchCode: 'B-MOR',
  batchName: 'Morning Elite',
  batchTime: '06:30 – 08:00',
  schedule: 'Mon, Wed, Fri',
  coaches: ['Coach Rao'],
  days: [
    { date: '2026-10-05', day: 5, weekday: 'Mon', scheduled: true },
    { date: '2026-10-06', day: 6, weekday: 'Tue', scheduled: false },
    { date: '2026-10-07', day: 7, weekday: 'Wed', scheduled: true },
  ],
  rows: [
    {
      studentId: 's1',
      studentCode: 'S1',
      studentName: 'Student One',
      cells: ['present', 'off', 'absent'],
      present: 1,
      late: 0,
      absent: 1,
      checkedOut: 0,
      recorded: 2,
      attended: 1,
      percentage: 50,
    },
  ],
};
function setup(canWrite = true) {
  const attendance = {
    history: vi.fn().mockResolvedValue({ rows: [record], total: 101 }),
    correctionPage: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1 }),
    correct: vi.fn().mockResolvedValue(null),
    register: vi.fn().mockResolvedValue(registerRecord),
    matrix: vi.fn().mockResolvedValue(matrixRecord),
  };
  const students = {
    list: vi
      .fn()
      .mockResolvedValue({ data: [{ id: 's1', full_name: 'Student One' }], count: 1, error: null }),
  };
  const batches = {
    list: vi.fn().mockResolvedValue([{ id: 'b1', name: 'Morning' }]),
  };
  const printDocuments = {
    printAttendanceRegister: vi.fn().mockResolvedValue(undefined),
    printAttendanceMatrix: vi.fn().mockResolvedValue(undefined),
  };
  const auth = { hasPermission: vi.fn().mockReturnValue(canWrite) };
  TestBed.configureTestingModule({
    imports: [AttendanceHistoryPage],
    providers: [
      provideRouter([]),
      { provide: AttendanceService, useValue: attendance },
      { provide: StudentsService, useValue: students },
      { provide: BatchesService, useValue: batches },
      { provide: PrintDocumentService, useValue: printDocuments },
      { provide: AuthService, useValue: auth },
      { provide: API_CONFIG, useValue: { useMockApi: false } },
      { provide: AcademyFacade, useValue: { students: signal([]), batches: signal([]), attendance: signal([]) } },
    ],
  });
  const fixture = TestBed.createComponent(AttendanceHistoryPage);
  return { fixture, component: fixture.componentInstance, attendance, printDocuments, auth };
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
    expect(filters.querySelector('.clear-filters')).toBeNull();
    expect(filters.querySelector('.result-summary')?.textContent).toContain('Last 30 days');

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
      'Daily register',
      'Monthly matrix',
      'Fewer filters',
      'Today',
      '7 days',
      '30 days',
      'Export',
    ]);
    expect(advanced.querySelector('.range-presets button.active')?.textContent).toContain('30 days');
    expect(
      filters.compareDocumentPosition(advanced.querySelector('.range-presets')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps the filters and table shell visible while records load', async () => {
    const { fixture, attendance } = setup();
    let resolveLoad!: (value: { rows: AttendanceHistoryRecord[]; total: number }) => void;
    attendance.history.mockImplementation(
      () => new Promise((resolve) => (resolveLoad = resolve)),
    );
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.loading-message')).toBeNull();
    expect(element.querySelector('.table-filters')).not.toBeNull();
    expect(element.querySelectorAll('.records .skeleton-row').length).toBe(5);
    expect(element.querySelector('.table-wrap')?.getAttribute('aria-busy')).toBe('true');

    resolveLoad({ rows: [record], total: 1 });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelectorAll('.records .skeleton-row').length).toBe(0);
    expect(element.querySelector('.table-wrap')?.getAttribute('aria-busy')).toBe('false');
  });

  it('debounces the student search before querying', async () => {
    const { fixture, component, attendance } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    const calls = attendance.history.mock.calls.length;

    component['onSearchChange'](selection('S1'));
    fixture.detectChanges();
    expect(attendance.history).toHaveBeenCalledTimes(calls);

    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(attendance.history).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      1,
      50,
      { search: 'S1' },
    );
  });

  it('keeps date ranges valid when either bound is moved past the other', () => {
    const { component } = setup();
    component['onFromChange'](selection('2999-01-01'));
    expect(component['to']()).toBe('2999-01-01');

    component['onToChange'](selection('2000-01-01'));
    expect(component['from']()).toBe('2000-01-01');
  });

  it('shows removable chips for applied filters', async () => {
    const { fixture, component } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() =>
      expect(component['allStudents']()).toEqual([{ id: 's1', name: 'Student One' }]),
    );

    component['onStatusChange'](selection('absent'));
    component['onStudentChange'](selection('s1'));
    fixture.detectChanges();

    const chips = [...fixture.nativeElement.querySelectorAll('.filter-chip')] as HTMLElement[];
    expect(chips.map((chip) => chip.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
      'Status: Absent',
      'Student: Student One',
    ]);
    expect(fixture.nativeElement.querySelector('.clear-filters')).not.toBeNull();

    chips[0].click();
    fixture.detectChanges();

    expect(component['status']()).toBe('all');
    expect(fixture.nativeElement.querySelectorAll('.filter-chip').length).toBe(1);
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

    row.querySelector<HTMLButtonElement>('.app-button')!.click();
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

  it('requires a batch and date before preparing a daily register', async () => {
    const { component, attendance } = setup();
    component['openRegister']();
    component['registerBatchId'].set('');
    await component['printRegister']();
    expect(attendance.register).not.toHaveBeenCalled();
    expect(component['registerError']()).toContain('Choose a batch');

    component['registerBatchId'].set('b1');
    component['registerDate'].set('');
    await component['printRegister']();
    expect(attendance.register).not.toHaveBeenCalled();
    expect(component['registerError']()).toContain('Choose the register date');
  });

  it('prints the daily register with the active batch date and remarks', async () => {
    const { fixture, component, attendance, printDocuments } = setup();
    fixture.detectChanges();
    await vi.waitFor(() =>
      expect(component['allBatches']()).toEqual([{ id: 'b1', name: 'Morning' }]),
    );

    component['openRegister']();
    fixture.detectChanges();

    expect(component['registerBatchId']()).toBe('b1');
    expect(component['registerIncludeRemarks']()).toBe(true);
    expect(fixture.nativeElement.querySelector('.register-dialog')?.textContent).toContain(
      'Daily attendance register',
    );
    expect(
      (fixture.nativeElement.querySelector('.register-checkbox input') as HTMLInputElement).checked,
    ).toBe(true);

    component['registerDate'].set('2026-10-15');
    await component['printRegister']('pdf');

    expect(attendance.register).toHaveBeenCalledWith('b1', '2026-10-15', { includeRemarks: true });
    expect(printDocuments.printAttendanceRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        registerNumber: 'ATR-BMOR-20261015',
        date: '2026-10-15',
        batchName: 'Morning Elite',
        batchCode: 'B-MOR',
        batchTime: '06:30 – 08:00',
        coaches: ['Coach Rao'],
        showRemarks: true,
        counts: registerRecord.counts,
      }),
      'pdf',
    );
    expect(component['registerDialogOpen']()).toBe(false);
  });

  it('withholds remarks when the role cannot correct attendance', async () => {
    const { fixture, component, attendance, printDocuments } = setup(false);
    fixture.detectChanges();
    await vi.waitFor(() =>
      expect(component['allBatches']()).toEqual([{ id: 'b1', name: 'Morning' }]),
    );

    component['openRegister']();
    fixture.detectChanges();

    expect(component['registerIncludeRemarks']()).toBe(false);
    expect(fixture.nativeElement.querySelector('.register-checkbox')).toBeNull();
    expect(fixture.nativeElement.querySelector('.register-hint')?.textContent).toContain(
      'Remarks require attendance correction permission',
    );

    component['registerDate'].set('2026-10-15');
    await component['printRegister']();

    expect(attendance.register).toHaveBeenCalledWith('b1', '2026-10-15', { includeRemarks: false });
    expect(printDocuments.printAttendanceRegister).toHaveBeenCalledWith(
      expect.objectContaining({ showRemarks: false }),
      'print',
    );
  });

  it('requires a batch and valid month before preparing the monthly matrix', async () => {
    const { component, attendance } = setup();
    component['openMatrix']();
    component['matrixBatchId'].set('');
    await component['printMatrix']();
    expect(attendance.matrix).not.toHaveBeenCalled();
    expect(component['matrixError']()).toContain('Choose a batch');

    component['matrixBatchId'].set('b1');
    component['matrixMonth'].set('2026-13');
    await component['printMatrix']();
    expect(attendance.matrix).not.toHaveBeenCalled();
    expect(component['matrixError']()).toContain('Choose the month');
  });

  it('prints the monthly matrix with the register number and live grid', async () => {
    const { fixture, component, attendance, printDocuments } = setup();
    fixture.detectChanges();
    await vi.waitFor(() =>
      expect(component['allBatches']()).toEqual([{ id: 'b1', name: 'Morning' }]),
    );

    component['openMatrix']();
    fixture.detectChanges();

    expect(component['matrixBatchId']()).toBe('b1');
    expect(component['matrixMonth']()).toBe(new Date().toISOString().slice(0, 7));
    expect(fixture.nativeElement.querySelector('.matrix-dialog')?.textContent).toContain(
      'Monthly attendance matrix',
    );

    component['matrixMonth'].set('2026-10');
    await component['printMatrix']('preview');

    expect(attendance.matrix).toHaveBeenCalledWith('b1', '2026-10');
    expect(printDocuments.printAttendanceMatrix).toHaveBeenCalledWith(
      expect.objectContaining({
        registerNumber: 'ATM-BMOR-202610',
        month: '2026-10',
        monthLabel: 'October 2026',
        batchName: 'Morning Elite',
        batchCode: 'B-MOR',
        batchTime: '06:30 – 08:00',
        schedule: 'Mon, Wed, Fri',
        coaches: ['Coach Rao'],
        days: matrixRecord.days,
        rows: matrixRecord.rows,
      }),
      'preview',
    );
    expect(component['matrixDialogOpen']()).toBe(false);
  });

  it('keeps the matrix dialog open and explains a failed query', async () => {
    const { fixture, component, attendance } = setup();
    fixture.detectChanges();
    await vi.waitFor(() =>
      expect(component['allBatches']()).toEqual([{ id: 'b1', name: 'Morning' }]),
    );
    attendance.matrix.mockRejectedValueOnce(new Error('Matrix read failed'));

    component['openMatrix']();
    component['matrixMonth'].set('2026-10');
    await component['printMatrix']();

    expect(component['matrixDialogOpen']()).toBe(true);
    expect(component['matrixError']()).toBe('Matrix read failed');
    expect(component['matrixLoading']()).toBe(false);
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
      button.textContent?.includes('Export'),
    ) as HTMLButtonElement;
    await vi.waitFor(() => expect(exportButton.disabled).toBe(false));
    exportButton.click();
    fixture.detectChanges();

    const download = [...fixture.nativeElement.querySelectorAll('.export-dialog button')].find(
      (button: HTMLButtonElement) => button.textContent?.includes('Download CSV'),
    ) as HTMLButtonElement;
    download.click();

    await vi.waitFor(async () => {
      const csv = await csvBlob.text();
      expect(csv).toContain('Morning');
      expect(csv).toContain("'=UNSAFE()");
    });
  });
});
