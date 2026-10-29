import { TableTools } from '../../shared/data-table/table-tools';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AcademyFacade } from '../../core/state/academy.facade';
import {
  AttendanceService,
  AttendanceHistoryRecord,
  BatchesService,
  StudentsService,
} from '../../core/supabase/domain-services';
import { API_CONFIG } from '../../core/config/api.config';
import { readAllPages } from '../../core/supabase/read-all-pages';
import { attendanceTimestamp } from '../../core/supabase/attendance-timestamp';
import { AsyncState } from '../../shared/async-state/async-state';
import { Pagination } from '../../shared/pagination/pagination';
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

@Component({
  selector: 'app-attendance-history-page',
  standalone: true,
  imports: [TableTools, FormsModule, DatePipe, Pagination, AsyncState],
  templateUrl: './attendance-history-page.html',
  styleUrl: './attendance-history-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceHistoryPage implements OnInit {
  protected readonly store = inject(AcademyFacade);
  private readonly attendance = inject(AttendanceService);
  private readonly studentsApi = inject(StudentsService);
  private readonly batchesApi = inject(BatchesService);
  private readonly toast = inject(ToastService);
  private readonly mock = inject(API_CONFIG).useMockApi;
  private request = 0;
  private lookupRequest = 0;

  protected readonly studentId = signal('');
  protected readonly batchId = signal('');
  protected readonly status = signal('all');
  protected readonly search = signal('');
  protected readonly showMoreFilters = signal(false);
  protected readonly from = signal(this.daysAgo(30));
  protected readonly to = signal(this.today());
  protected advancedFilterCount(): number {
    return (
      Number(!!this.studentId()) +
      Number(!!this.batchId()) +
      Number(this.from() !== this.daysAgo(30)) +
      Number(this.to() !== this.today())
    );
  }
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
      this.search();
      this.from();
      this.to();
      this.pageSize();
      untracked(() => void this.loadAttendanceHistory());
    });
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
        ...(this.search().trim() ? { search: this.search().trim() } : {}),
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
    this.search.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  protected onFromChange(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value || this.daysAgo(30));
    this.page.set(1);
  }

  protected onToChange(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value || this.today());
    this.page.set(1);
  }

  protected setRange(days: number): void {
    this.from.set(this.daysAgo(days));
    this.to.set(this.today());
    this.page.set(1);
  }

  protected resetFilters(): void {
    this.studentId.set('');
    this.batchId.set('');
    this.status.set('all');
    this.search.set('');
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
            (row.student?.full_name ?? '').toLowerCase().includes(filters.search.toLowerCase())),
      )
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date) || a.id.localeCompare(b.id));
    const start = (this.page() - 1) * this.pageSize();
    return { rows: rows.slice(start, start + this.pageSize()), total: rows.length };
  }
}
