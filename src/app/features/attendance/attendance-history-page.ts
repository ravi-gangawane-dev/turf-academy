import { TableTools } from '../../shared/data-table/table-tools';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AcademyFacade } from '../../core/state/academy.facade';
import {
  AttendanceMatrixRecord,
  AttendanceRegisterRecord,
  AttendanceService,
  AttendanceHistoryRecord,
  BatchesService,
  StudentsService,
} from '../../core/supabase/domain-services';
import { API_CONFIG } from '../../core/config/api.config';
import { readAllPages } from '../../core/supabase/read-all-pages';
import { attendanceTimestamp } from '../../core/supabase/attendance-timestamp';
import { AuthService } from '../../core/auth/auth.service';
import { AsyncState } from '../../shared/async-state/async-state';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import { Pagination } from '../../shared/pagination/pagination';
import {
  PrintAttendanceMatrixDocument,
  PrintAttendanceRegisterDocument,
  PrintDestination,
} from '../../shared/print/print-document.models';
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { ToastService } from '../../shared/toast/toast.service';

interface CorrectionDraft {
  studentId: string;
  date: string;
  recordId: string;
  batchName: string;
  status: string;
  checkIn: string;
  checkOut: string;
  reason: string;
}

interface ActiveFilter {
  key: 'search' | 'status' | 'student' | 'batch' | 'dates';
  label: string;
}

@Component({
  selector: 'app-attendance-history-page',
  standalone: true,
  imports: [TableTools, FormsModule, DatePipe, Pagination, AsyncState, ModalFocus],
  templateUrl: './attendance-history-page.html',
  styleUrl: './attendance-history-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceHistoryPage implements OnInit, OnDestroy {
  protected readonly store = inject(AcademyFacade);
  private readonly attendance = inject(AttendanceService);
  private readonly studentsApi = inject(StudentsService);
  private readonly batchesApi = inject(BatchesService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly printDocuments = inject(PrintDocumentService);
  private readonly mock = inject(API_CONFIG).useMockApi;
  private request = 0;
  private lookupRequest = 0;
  private registerRequest = 0;
  private matrixRequest = 0;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly studentId = signal('');
  protected readonly batchId = signal('');
  protected readonly status = signal('all');
  protected readonly search = signal('');
  private readonly debouncedSearch = signal('');
  protected readonly showMoreFilters = signal(false);
  protected readonly from = signal(this.daysAgo(30));
  protected readonly to = signal(this.today());
  protected readonly loadingRows = [1, 2, 3, 4, 5];

  protected advancedFilterCount(): number {
    return (
      Number(!!this.studentId()) +
      Number(!!this.batchId()) +
      Number(this.from() !== this.daysAgo(30)) +
      Number(this.to() !== this.today())
    );
  }

  protected readonly activeRange = computed<number | null>(() => {
    const from = this.from();
    const to = this.to();
    const today = this.today();
    if (to !== today) return null;
    if (from === today) return 0;
    if (from === this.daysAgo(7)) return 7;
    if (from === this.daysAgo(30)) return 30;
    return null;
  });

  protected readonly activeFilters = computed<readonly ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    const search = this.search().trim();
    if (search) filters.push({ key: 'search', label: `Search: “${search}”` });
    if (this.status() !== 'all') {
      filters.push({ key: 'status', label: `Status: ${this.statusLabel(this.status())}` });
    }
    if (this.studentId()) {
      filters.push({ key: 'student', label: `Student: ${this.studentName(this.studentId())}` });
    }
    if (this.batchId()) {
      filters.push({ key: 'batch', label: `Batch: ${this.batchName(this.batchId())}` });
    }
    if (!this.isDefaultRange()) {
      filters.push({ key: 'dates', label: this.rangeLabel() });
    }
    return filters;
  });

  protected readonly hasActiveFilters = computed(() => this.activeFilters().length > 0);

  protected readonly resultSummary = computed(() => {
    const range = this.rangeLabel();
    if (this.loading()) return `Updating records… · ${range}`;
    const total = this.total();
    if (!total) return `No records · ${range}`;
    const start = (this.page() - 1) * this.pageSize() + 1;
    const end = Math.min(this.page() * this.pageSize(), total);
    return `Showing ${start}–${end} of ${total} · ${range}`;
  });

  protected toggleMoreFilters(): void {
    this.showMoreFilters.update((show) => !show);
  }
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly optionsError = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(50);

  protected readonly records = signal<readonly AttendanceHistoryRecord[]>([]);
  protected readonly total = signal(0);

  protected readonly registerDialogOpen = signal(false);
  protected readonly registerBatchId = signal('');
  protected readonly registerDate = signal('');
  protected readonly registerIncludeRemarks = signal(false);
  protected readonly registerLoading = signal(false);
  protected readonly registerError = signal('');
  protected readonly canIncludeRemarks = computed(() =>
    this.auth.hasPermission('attendance:write'),
  );

  protected readonly matrixDialogOpen = signal(false);
  protected readonly matrixBatchId = signal('');
  protected readonly matrixMonth = signal(new Date().toISOString().slice(0, 7));
  protected readonly matrixLoading = signal(false);
  protected readonly matrixError = signal('');

  protected readonly allStudents = signal<readonly { id: string; name: string }[]>([]);
  protected readonly allBatches = signal<readonly { id: string; name: string }[]>([]);
  protected readonly visibleRecords = this.records;

  protected readonly columns = [
    'Date',
    'Student',
    'Student code',
    'Day',
    'Check In',
    'Check Out',
    'Status',
    'Batch',
    'Source',
    'Remarks',
  ];

  protected readonly draft = signal<CorrectionDraft>({
    studentId: '',
    date: this.today(),
    recordId: '',
    batchName: '',
    status: 'present',
    checkIn: '',
    checkOut: '',
    reason: '',
  });
  protected readonly draftNotice = signal('');
  protected readonly draftError = signal('');
  protected readonly saving = signal(false);
  protected readonly correctionRailCollapsed = signal(false);

  protected toggleCorrectionRail(): void {
    this.correctionRailCollapsed.update((collapsed) => !collapsed);
  }

  protected readonly statusOptions = [
    { value: 'present', label: 'Present' },
    { value: 'late', label: 'Late' },
    { value: 'absent', label: 'Absent' },
    { value: 'checked_out', label: 'Checked out' },
  ];

  constructor() {
    effect(() => {
      // Reload when page or filters change
      this.page();
      this.studentId();
      this.batchId();
      this.status();
      this.debouncedSearch();
      this.from();
      this.to();
      this.pageSize();
      untracked(() => void this.loadAttendanceHistory());
    });
  }

  ngOnDestroy(): void {
    this.clearSearchTimer();
  }

  async ngOnInit(): Promise<void> {
    if (this.mock) {
      this.allStudents.set(this.store.students());
      this.allBatches.set(this.store.batches());
      return;
    }
    try {
      const [batches, students] = await Promise.all([
        this.batchesApi.list(),
        readAllPages('List students', (offset, limit) =>
          this.studentsApi.list('', offset, offset + limit - 1),
        ),
      ]);
      this.allBatches.set(
        batches.map((row) => ({ id: String(row.id), name: String(row.name) })),
      );
      this.allStudents.set(
        students.map((row) => ({ id: String(row.id), name: String(row.full_name) })),
      );
    } catch {
      this.optionsError.set('Filter choices could not be loaded. Please reload the page.');
    }
  }

  private async loadAttendanceHistory(): Promise<void> {
    const request = ++this.request;
    try {
      this.loading.set(true);
      this.error.set('');

      const filters = {
        studentId: this.studentId() || undefined,
        status: this.status() === 'all' ? undefined : this.status(),
        ...(this.batchId() ? { batchId: this.batchId() } : {}),
        ...(this.debouncedSearch() ? { search: this.debouncedSearch() } : {}),
      };
      const result = this.mock
        ? this.mockHistory(this.from(), this.to(), filters)
        : await this.attendance.history(
            this.from(),
            this.to(),
            this.page(),
            this.pageSize(),
            filters,
          );
      if (request !== this.request) return;
      this.records.set(result.rows);
      this.total.set(result.total);
    } catch (err) {
      if (request !== this.request) return;
      this.records.set([]);
      this.total.set(0);
      this.error.set(err instanceof Error ? err.message : 'Failed to load attendance history');
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }

  protected onStudentChange(event: Event): void {
    const studentId = (event.target as HTMLSelectElement).value;
    this.studentId.set(studentId);
    this.page.set(1); // Reset to first page
  }

  protected onBatchChange(event: Event): void {
    this.batchId.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  protected onStatusChange(event: Event): void {
    const status = (event.target as HTMLSelectElement).value;
    this.status.set(status);
    this.page.set(1); // Reset to first page
  }

  protected onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      this.searchTimer = undefined;
      this.debouncedSearch.set(value.trim());
      this.page.set(1);
    }, 300);
  }

  protected onFromChange(event: Event): void {
    const from = (event.target as HTMLInputElement).value || this.daysAgo(30);
    this.from.set(from);
    if (from > this.to()) this.to.set(from);
    this.page.set(1);
  }

  protected onToChange(event: Event): void {
    const to = (event.target as HTMLInputElement).value || this.today();
    this.to.set(to);
    if (to < this.from()) this.from.set(to);
    this.page.set(1);
  }

  protected setRange(days: number): void {
    this.from.set(this.daysAgo(days));
    this.to.set(this.today());
    this.page.set(1);
  }

  protected removeFilter(key: ActiveFilter['key']): void {
    switch (key) {
      case 'search':
        this.clearSearchTimer();
        this.search.set('');
        this.debouncedSearch.set('');
        break;
      case 'status':
        this.status.set('all');
        break;
      case 'student':
        this.studentId.set('');
        break;
      case 'batch':
        this.batchId.set('');
        break;
      case 'dates':
        this.from.set(this.daysAgo(30));
        this.to.set(this.today());
        break;
    }
    this.page.set(1);
  }

  protected resetFilters(): void {
    this.clearSearchTimer();
    this.studentId.set('');
    this.batchId.set('');
    this.status.set('all');
    this.search.set('');
    this.debouncedSearch.set('');
    this.from.set(this.daysAgo(30));
    this.to.set(this.today());
    this.page.set(1);
    this.showMoreFilters.set(false);
  }

  protected onPageChange(newPage: number): void {
    this.page.set(newPage);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  protected openRegister(): void {
    this.registerError.set('');
    this.registerBatchId.set(this.batchId() || this.allBatches()[0]?.id || '');
    this.registerDate.set(this.to() || this.today());
    this.registerIncludeRemarks.set(this.canIncludeRemarks());
    this.registerDialogOpen.set(true);
  }

  protected closeRegister(): void {
    this.registerRequest += 1;
    this.registerDialogOpen.set(false);
    this.registerLoading.set(false);
    this.registerError.set('');
  }

  protected onRegisterBatchChange(event: Event): void {
    this.registerBatchId.set((event.target as HTMLSelectElement).value);
  }

  protected onRegisterDateChange(event: Event): void {
    this.registerDate.set((event.target as HTMLInputElement).value);
  }

  protected onRegisterRemarksChange(event: Event): void {
    this.registerIncludeRemarks.set((event.target as HTMLInputElement).checked);
  }

  protected async printRegister(destination: PrintDestination = 'print'): Promise<void> {
    if (this.registerLoading()) return;
    const batchId = this.registerBatchId();
    const date = this.registerDate();
    this.registerError.set('');
    if (!batchId) {
      this.registerError.set('Choose a batch to print the register.');
      return;
    }
    if (!date) {
      this.registerError.set('Choose the register date.');
      return;
    }

    const request = ++this.registerRequest;
    const includeRemarks = this.canIncludeRemarks() && this.registerIncludeRemarks();
    this.registerLoading.set(true);
    try {
      const register = await this.attendance.register(batchId, date, { includeRemarks });
      if (request !== this.registerRequest) return;
      this.registerDialogOpen.set(false);
      await this.printDocuments.printAttendanceRegister(
        this.registerDocument(register, includeRemarks),
        destination,
      );
    } catch (error) {
      if (request !== this.registerRequest) return;
      this.registerError.set(
        error instanceof Error ? error.message : 'The attendance register could not be prepared.',
      );
    } finally {
      if (request === this.registerRequest) this.registerLoading.set(false);
    }
  }

  private registerDocument(
    register: AttendanceRegisterRecord,
    showRemarks: boolean,
  ): Omit<PrintAttendanceRegisterDocument, 'kind' | 'brand'> {
    const code =
      (register.batchCode || register.batchId).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 14) ||
      'BATCH';
    return {
      registerNumber: `ATR-${code}-${register.date.replace(/\D/g, '')}`,
      issuedAt: new Date().toISOString(),
      date: register.date,
      batchName: register.batchName,
      batchCode: register.batchCode,
      batchTime: register.batchTime || undefined,
      coaches: register.coaches,
      rows: register.rows.map((row) => ({
        studentCode: row.studentCode,
        studentName: row.studentName,
        status: row.status,
        checkInAt: row.checkInAt,
        checkOutAt: row.checkOutAt,
        remarks: row.remarks,
      })),
      counts: register.counts,
      showRemarks,
    };
  }

  protected openMatrix(): void {
    this.matrixError.set('');
    this.matrixBatchId.set(this.batchId() || this.allBatches()[0]?.id || '');
    this.matrixMonth.set(this.currentMonth());
    this.matrixDialogOpen.set(true);
  }

  protected closeMatrix(): void {
    this.matrixRequest += 1;
    this.matrixDialogOpen.set(false);
    this.matrixLoading.set(false);
    this.matrixError.set('');
  }

  protected onMatrixBatchChange(event: Event): void {
    this.matrixBatchId.set((event.target as HTMLSelectElement).value);
  }

  protected onMatrixMonthChange(event: Event): void {
    this.matrixMonth.set((event.target as HTMLInputElement).value);
  }

  protected async printMatrix(destination: PrintDestination = 'print'): Promise<void> {
    if (this.matrixLoading()) return;
    const batchId = this.matrixBatchId();
    const month = this.matrixMonth();
    this.matrixError.set('');
    if (!batchId) {
      this.matrixError.set('Choose a batch to print the matrix.');
      return;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      this.matrixError.set('Choose the month to print the matrix.');
      return;
    }

    const request = ++this.matrixRequest;
    this.matrixLoading.set(true);
    try {
      const matrix = await this.attendance.matrix(batchId, month);
      if (request !== this.matrixRequest) return;
      this.matrixDialogOpen.set(false);
      await this.printDocuments.printAttendanceMatrix(this.matrixDocument(matrix), destination);
    } catch (error) {
      if (request !== this.matrixRequest) return;
      this.matrixError.set(
        error instanceof Error ? error.message : 'The attendance matrix could not be prepared.',
      );
    } finally {
      if (request === this.matrixRequest) this.matrixLoading.set(false);
    }
  }

  private matrixDocument(
    matrix: AttendanceMatrixRecord,
  ): Omit<PrintAttendanceMatrixDocument, 'kind' | 'brand'> {
    const code =
      (matrix.batchCode || matrix.batchId).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 14) ||
      'BATCH';
    return {
      registerNumber: `ATM-${code}-${matrix.month.replace(/\D/g, '')}`,
      issuedAt: new Date().toISOString(),
      month: matrix.month,
      monthLabel: matrix.monthLabel,
      batchName: matrix.batchName,
      batchCode: matrix.batchCode,
      batchTime: matrix.batchTime || undefined,
      schedule: matrix.schedule,
      coaches: matrix.coaches,
      days: matrix.days,
      rows: matrix.rows,
    };
  }

  /** Load a table row into the correction form. */
  protected startCorrection(row: AttendanceHistoryRecord): void {
    this.applyRecord(row, row.student?.id ?? '');
    this.draft.update((draft) => ({ ...draft, reason: '' }));
    this.draftNotice.set('');
    this.draftError.set('');
  }

  protected async onCorrectionStudent(event: Event): Promise<void> {
    this.draft.update((draft) => ({ ...draft, studentId: (event.target as HTMLSelectElement).value }));
    await this.loadCorrectionRecord();
  }

  protected async onCorrectionDate(event: Event): Promise<void> {
    const date = (event.target as HTMLInputElement).value || this.today();
    this.draft.update((draft) => ({ ...draft, date }));
    await this.loadCorrectionRecord();
  }

  protected onCorrectionStatus(event: Event): void {
    this.draft.update((draft) => ({ ...draft, status: (event.target as HTMLSelectElement).value }));
  }

  protected onCorrectionCheckIn(event: Event): void {
    this.draft.update((draft) => ({ ...draft, checkIn: (event.target as HTMLInputElement).value }));
  }

  protected onCorrectionCheckOut(event: Event): void {
    this.draft.update((draft) => ({ ...draft, checkOut: (event.target as HTMLInputElement).value }));
  }

  protected onCorrectionReason(event: Event): void {
    this.draft.update((draft) => ({ ...draft, reason: (event.target as HTMLTextAreaElement).value }));
  }

  protected resetCorrection(): void {
    this.lookupRequest++;
    this.draft.set({
      studentId: '',
      date: this.today(),
      recordId: '',
      batchName: '',
      status: 'present',
      checkIn: '',
      checkOut: '',
      reason: '',
    });
    this.draftNotice.set('');
    this.draftError.set('');
  }

  protected async saveCorrection(): Promise<void> {
    const draft = this.draft();
    this.draftError.set('');
    if (!draft.recordId) {
      this.draftError.set(
        this.draftNotice() || 'Choose a student and date with an existing attendance record.',
      );
      return;
    }
    if (draft.reason.trim().length < 3) {
      this.draftError.set('Enter a reason with at least 3 characters.');
      return;
    }
    if (this.mock) {
      this.draftError.set('Corrections need the live workspace; the demo data is read-only.');
      return;
    }

    this.saving.set(true);
    try {
      await this.attendance.correct(
        draft.recordId,
        {
          status: draft.status,
          check_in_at: this.timestamp(draft.date, draft.checkIn),
          check_out_at: this.timestamp(draft.date, draft.checkOut),
        },
        draft.reason.trim(),
      );
      this.draft.update((value) => ({ ...value, reason: '' }));
      this.draftNotice.set('Correction saved. The updated record is shown in the table.');
      this.toast.show('Attendance corrected.', 'success');
      await this.loadAttendanceHistory();
    } catch (error) {
      this.draftError.set(
        error instanceof Error ? error.message : 'The correction could not be saved.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected statusLabel(status: string): string {
    return (status || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private studentName(id: string): string {
    return this.allStudents().find((student) => student.id === id)?.name ?? 'Selected student';
  }

  private batchName(id: string): string {
    return this.allBatches().find((batch) => batch.id === id)?.name ?? 'Selected batch';
  }

  private isDefaultRange(): boolean {
    return this.from() === this.daysAgo(30) && this.to() === this.today();
  }

  private rangeLabel(): string {
    const from = this.from();
    const to = this.to();
    const today = this.today();
    if (from === today && to === today) return 'Today';
    if (to === today && from === this.daysAgo(7)) return 'Last 7 days';
    if (to === today && from === this.daysAgo(30)) return 'Last 30 days';
    return `${this.formatDate(from)} – ${this.formatDate(to)}`;
  }

  private formatDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private clearSearchTimer(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
  }

  private async loadCorrectionRecord(): Promise<void> {
    const { studentId, date } = this.draft();
    this.lookupRequest++;
    this.draftNotice.set('');
    this.draftError.set('');
    if (!studentId || !date) {
      this.draft.update((draft) => ({
        ...draft,
        recordId: '',
        batchName: '',
        checkIn: '',
        checkOut: '',
      }));
      return;
    }

    const request = this.lookupRequest;
    try {
      const result = this.mock
        ? this.mockHistory(date, date, { studentId })
        : await this.attendance.history(date, date, 1, 10, { studentId });
      if (request !== this.lookupRequest) return;
      const record = result.rows[0];
      if (!record) {
        this.draft.update((draft) => ({
          ...draft,
          recordId: '',
          batchName: '',
          checkIn: '',
          checkOut: '',
        }));
        this.draftNotice.set(
          'No attendance record exists for this date. Use Check In / Check Out to mark attendance first.',
        );
        return;
      }
      this.applyRecord(record, studentId);
    } catch (error) {
      if (request === this.lookupRequest) {
        this.draftError.set(
          error instanceof Error ? error.message : 'The attendance record could not be loaded.',
        );
      }
    }
  }

  private applyRecord(record: AttendanceHistoryRecord, studentId: string): void {
    this.draft.update((draft) => ({
      ...draft,
      studentId,
      date: record.attendance_date,
      recordId: record.id,
      batchName: record.batch?.name ?? '',
      status: record.status,
      checkIn: this.timeValue(record.check_in_at),
      checkOut: this.timeValue(record.check_out_at),
    }));
  }

  private timeValue(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private timestamp(date: string, time: string): string | null {
    if (!time) return null;
    const parsed = new Date(`${date}T${time}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private currentMonth(): string {
    return this.today().slice(0, 7);
  }

  private daysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  private mockHistory(
    from: string,
    to: string,
    filters: { studentId?: string; batchId?: string; status?: string; search?: string },
  ) {
    const rows: AttendanceHistoryRecord[] = this.store
      .attendance()
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
          full_name:
            this.store.students().find((student) => student.id === row.studentId)?.name ?? '',
        },
        batch: {
          id: row.batchId,
          name: this.store.batches().find((batch) => batch.id === row.batchId)?.name ?? '',
        },
      }))
      .filter(
        (row) =>
          row.attendance_date >= from &&
          row.attendance_date <= to &&
          (!filters.studentId || row.student?.id === filters.studentId) &&
          (!filters.batchId || row.batch?.id === filters.batchId) &&
          (!filters.status || row.status === filters.status) &&
          (!filters.search ||
            [row.student?.full_name, row.student?.student_code].some((value) =>
              (value ?? '').toLowerCase().includes(filters.search!.toLowerCase()),
            )),
      )
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date) || a.id.localeCompare(b.id));
    const start = (this.page() - 1) * this.pageSize();
    return { rows: rows.slice(start, start + this.pageSize()), total: rows.length };
  }
}
