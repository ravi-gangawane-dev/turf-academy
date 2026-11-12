import { CommonModule, DatePipe, formatDate, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { EnrollmentsService } from '../../core/supabase/domain-services';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import {
  EnrollmentBatch, EnrollmentConfirmationRecord, EnrollmentHistoryFilters,
  EnrollmentHistoryRow, EnrollmentPlan, EnrollmentRecord, EnrollmentStudent, EnrollmentWorkspace
} from '../../core/supabase/enrollment.models';
import { ServerListService } from '../../core/supabase/server-list.service';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { AsyncState } from '../../shared/async-state/async-state';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { DataTable } from '../../shared/data-table/data-table';
import { TableTools } from '../../shared/data-table/table-tools';
import { PageHero } from '../../shared/page-hero/page-hero';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { ExportColumn, ExportRow } from '../../shared/export/export.models';
import { ToastService } from '../../shared/toast/toast.service';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import {
  PrintDestination,
  PrintEnrollmentAction,
  PrintEnrollmentConfirmationDocument,
  PrintEnrollmentTerm,
} from '../../shared/print/print-document.models';
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { EnrollmentMetrics } from './enrollment-metrics';
type EnrollmentListRow = EnrollmentRecord & { student?: EnrollmentStudent; batch?: EnrollmentBatch; plan?: EnrollmentPlan };

const today = () => new Date().toLocaleDateString('en-CA');
function dateRange(control: AbstractControl) {
  const from = control.get('startDate')?.value,
    to = control.get('dueDate')?.value;
  return from && to && to < from ? { dateRange: true } : null;
}
type View = 'list' | 'new' | 'transfer' | 'pause' | 'cancel' | 'history';

@Component({
  selector: 'app-enrollments-page',
  imports: [
    TableTools,
    RouterLink,
    AcademyMoneyPipe,
    DatePipe,
    TitleCasePipe,
    RouterModule,
    ColumnFilter,
    PageHero,
    AsyncState,
    ReactiveFormsModule,
    DataTable,
    EnrollmentMetrics,
    StatusBadge,
    SortableHeader,
    CommonModule,
    ModalFocus
  ],
  templateUrl: './enrollments-page.html',
  styleUrl: './enrollments-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentsPage implements OnInit {
  protected readonly columns = createColumnFilters(() => this.filterChanged(), () => { ++this.loadId; this.page.set(1); });
  protected readonly historyColumns = createColumnFilters(() => { this.page.set(1); void this.loadHistory(); }, () => { ++this.historyLoadId; });
  protected readonly historySort = signal('created_at');
  protected readonly historyDirection = signal<'asc' | 'desc'>('desc');
  protected sortHistory(key: string) { this.historyDirection.set(this.historySort() === key && this.historyDirection() === 'asc' ? 'desc' : 'asc'); this.historySort.set(key); this.page.set(1); void this.loadHistory(); }
  private historyQuery(): EnrollmentHistoryFilters { return { ...this.historyFilters, columns: this.historyColumns.params(), sortBy: this.historySort(), sortDirection: this.historyDirection() }; }
  private readonly lists = inject(ServerListService);
  protected readonly total = signal(0);
  protected readonly listRows = signal<EnrollmentListRow[]>([]);
  protected readonly listMetrics = signal({ total: 0, active: 0, paused: 0, cancelled: 0, expiring: 0 });
  private readonly api = inject(EnrollmentsService);
  private readonly preferences = inject(AcademyPreferencesService);
  private readonly printDocuments = inject(PrintDocumentService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly view: View = this.route.snapshot.data['enrollmentView'] ?? 'list';
  protected readonly title = {
    list: 'Enrollment List',
    new: 'New Enrollment',
    transfer: 'Transfer Batch',
    pause: 'Pause Enrollment',
    cancel: 'Cancel Enrollment',
    history: 'Enrollment History',
  }[this.view];
  protected readonly summaryCards = signal([
    { title: 'Total Enrollments', subtitle: 'All time', icon: 'people', color: 'light-green' },
    { title: 'Active Enrollments', subtitle: '90.9% of total', icon: 'person', color: 'light-green' },
    { title: 'Paused Enrollments', subtitle: '4.5% of total', icon: 'pause', color: 'light-orange' },
    { title: 'Cancelled Enrollments', subtitle: '4.5% of total', icon: 'close', color: 'light-red' },
    { title: 'Expiring Soon', subtitle: 'Next 30 days', icon: 'calendar', color: 'light-purple' },
  ]);
  protected readonly workspace = signal<EnrollmentWorkspace>({
    students: [],
    batches: [],
    plans: [],
    enrollments: [],
  });
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly query = signal('');
  protected readonly statusFilter = signal('');
  protected readonly batchFilter = signal('');
  protected readonly sortBy = signal('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly selectedId = signal(this.route.snapshot.queryParamMap.get('enrollment') ?? '');
  protected readonly selectedStudentId = signal('');
  protected readonly selectedPlanId = signal('');
  protected readonly historyRows = signal<EnrollmentHistoryRow[]>([]);
  protected readonly historyTotal = signal(0);
  protected readonly historyLoading = signal(false);
  protected readonly historyError = signal('');
  protected readonly confirmationOpen = signal(false);
  protected readonly confirmation = signal<EnrollmentConfirmationRecord | null>(null);
  protected readonly confirmationAction = signal<PrintEnrollmentAction>('created');
  protected readonly confirmationLoading = signal(false);
  protected readonly confirmationError = signal('');
  protected readonly dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  private confirmationId = '';
  private confirmationReason = '';
  private confirmationRequest = 0;
  private loadId = 0;
  private historyLoadId = 0;
  private historyFilters: EnrollmentHistoryFilters = {
    search: '',
    action: '',
    studentId: '',
    batchId: '',
    from: '',
    to: '',
  };
  protected readonly form = this.fb.nonNullable.group(
    {
      studentId: ['', Validators.required],
      batchId: ['', Validators.required],
      feePlanId: ['', Validators.required],
      startDate: [today(), Validators.required],
      dueDate: [''],
      notes: ['', Validators.maxLength(1000)],
    },
    { validators: dateRange },
  );
  protected changeSortBy(event: Event): void { this.sortBy.set((event.target as HTMLSelectElement).value); this.filterChanged(); }
  protected sortColumn(key: string): void { this.sortDirection.set(this.sortBy() === key ? (this.sortDirection() === 'asc' ? 'desc' : 'asc') : 'asc'); this.sortBy.set(key); this.filterChanged(); }
  protected changeSortDirection(event: Event): void { this.sortDirection.set((event.target as HTMLSelectElement).value === 'desc' ? 'desc' : 'asc'); this.filterChanged(); }
  protected readonly actionForm = this.fb.nonNullable.group({
    batchId: [''],
    reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1000)]],
  });
  protected readonly historyForm = this.fb.nonNullable.group({
    search: [''],
    action: [''],
    studentId: [''],
    batchId: [''],
    from: [''],
    to: [''],
  });
  protected readonly rows = computed(() => {
    const data = this.workspace();
    const students = new Map(data.students.map((row) => [row.id, row]));
    const batches = new Map(data.batches.map((row) => [row.id, row]));
    const plans = new Map(data.plans.map((row) => [row.id, row]));
    return data.enrollments.map((row) => ({
      ...row,
      student: students.get(row.student_id),
      batch: batches.get(row.batch_id),
      plan: plans.get(row.fee_plan_id),
    }));
  });
  protected readonly filteredRows = computed(() => this.listRows());
  protected readonly visibleRows = computed(() => this.listRows());
  protected readonly metrics = computed(() => {
    if (this.view === 'list') return this.listMetrics();
    const rows = this.rows(),
      end = new Date();
    end.setDate(end.getDate() + 30);
    return {
      total: rows.length,
      active: rows.filter((r) => r.status === 'active').length,
      paused: rows.filter((r) => r.status === 'paused').length,
      cancelled: rows.filter((r) => r.status === 'cancelled').length,
      expiring: rows.filter(
        (r) =>
          r.status === 'active' &&
          r.valid_till &&
          r.valid_till >= today() &&
          r.valid_till <= end.toLocaleDateString('en-CA'),
      ).length,
    };
  });
  protected readonly eligibleStudents = computed(() => {
    const occupied = new Set(
      this.rows()
        .filter((r) => r.status !== 'cancelled')
        .map((r) => r.student_id),
    );
    return this.workspace().students.filter((s) => s.status === 'active' && !occupied.has(s.id));
  });
  protected readonly activeBatches = computed(() =>
    this.workspace().batches.filter((b) => b.status === 'active'),
  );
  protected readonly activePlans = computed(() =>
    this.workspace().plans.filter((p) => p.status === 'active'),
  );
  protected readonly selectedStudent = computed(() =>
    this.workspace().students.find((s) => s.id === this.selectedStudentId()),
  );
  protected readonly selectedPlan = computed(() =>
    this.workspace().plans.find((p) => p.id === this.selectedPlanId()),
  );
  protected readonly selectedRow = computed(() =>
    this.rows().find((row) => row.id === this.selectedId()),
  );
  protected readonly actionableRows = computed(() =>
    this.rows().filter((row) =>
      this.view === 'transfer' || this.view === 'pause'
        ? row.status === 'active'
        : row.status !== 'cancelled',
    ),
  );

  constructor() {
    const message = this.router.getCurrentNavigation()?.extras.state?.['message'];
    if (typeof message === 'string') this.toast.success(message);
  }
  async ngOnInit(): Promise<void> {
    if (this.view === 'history') { this.loading.set(false); await this.loadHistory(); } else await this.reload();
  }
  protected async reload(): Promise<void> {
    const request = ++this.loadId;
    this.loading.set(true);
    this.error.set('');
    try {
      if (this.view === 'list') {
        const result = await this.lists.page<EnrollmentListRow, ReturnType<typeof this.listMetrics>, { batches: EnrollmentBatch[] }>('enrollments', this.page(), this.pageSize(), { ...this.columns.params(), search: this.query(), status: this.statusFilter(), batchId: this.batchFilter(), sortBy: this.sortBy(), sortDirection: this.sortDirection() });
        if (request !== this.loadId) return;
        this.listRows.set(result.rows); this.total.set(result.total); this.page.set(result.page); this.listMetrics.set(result.metrics);
        this.workspace.set({ students: [], batches: result.options.batches, plans: [], enrollments: [] });
        return;
      }
      const data = await this.api.workspace();
      if (request === this.loadId) this.workspace.set(data);
    } catch (error) {
      if (request === this.loadId) this.error.set(this.errorText(error));
    } finally {
      if (request === this.loadId) this.loading.set(false);
    }
  }
  protected studentChanged(): void {
    this.selectedStudentId.set(this.form.controls.studentId.value);
  }
  protected planChanged(): void {
    this.selectedPlanId.set(this.form.controls.feePlanId.value);
  }
  protected batchChanged(): void {
    const batch = this.activeBatches().find((b) => b.id === this.form.controls.batchId.value);
    const plan = this.activePlans().find((p) => p.id === batch?.fee_plan_id);
    this.form.controls.feePlanId.setValue(plan?.id ?? '');
    this.planChanged();
  }
  protected async submit(): Promise<void> {
    if (this.saving() || this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    await this.save(
      () =>
        this.api.create(
          value.studentId,
          value.batchId,
          value.feePlanId,
          value.startDate,
          value.dueDate || undefined,
          value.notes.trim() || undefined,
        ),
      'Enrollment created successfully.',
      'created',
    );
  }
  protected async applyAction(): Promise<void> {
    if (this.saving() || this.loading()) return;
    const row = this.selectedRow(),
      value = this.actionForm.getRawValue();
    if (!row || this.actionForm.invalid || value.reason.trim().length < 3) {
      this.actionForm.markAllAsTouched();
      this.error.set('Select an enrollment and enter a reason of at least 3 characters.');
      this.toast.error('Select an enrollment and enter a reason of at least 3 characters.');
      return;
    }
    if (!this.actionableRows().some((item) => item.id === row.id)) {
      this.error.set('This enrollment is no longer eligible for this action.');
      this.toast.error('This enrollment is no longer eligible for this action.');
      return;
    }
    if (this.view === 'transfer') {
      if (!value.batchId || value.batchId === row.batch_id) {
        this.error.set('Select a different active batch.');
      this.toast.error('Select a different active batch.');
        return;
      }
      await this.save(
        () => this.api.transfer(row.id, value.batchId, today(), value.reason.trim()),
        'Student transferred successfully.',
        'transferred',
        value.reason.trim(),
      );
    } else {
      const status = this.view === 'pause' ? 'paused' : 'cancelled';
      await this.save(
        () => this.api.changeStatus(row.id, status, value.reason.trim()),
        `Enrollment ${status}.`,
        status === 'paused' ? 'paused' : 'cancelled',
        value.reason.trim(),
      );
    }
  }
  protected async reactivate(id: string): Promise<void> {
    await this.save(async () => {
      await this.api.changeStatus(id, 'active', 'Resumed from enrollment list');
    }, 'Enrollment reactivated.');
  }
  protected async pause(id: string): Promise<void> {
    if (confirm('Pause this enrollment? This will set the status to paused.')) {
      await this.api.changeStatus(id, 'paused', 'Enrollment paused');
    }
  }
  private async save(
    write: () => Promise<unknown>,
    message: string,
    confirmationAction?: PrintEnrollmentAction,
    reason = '',
  ): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const result = await write();
      this.toast.success(message);
      const id = this.enrollmentIdOf(result);
      if (confirmationAction && id) {
        this.beginConfirmation(id, confirmationAction, reason);
      } else if (confirmationAction) {
        await this.router.navigate(['/enrollments']);
      } else {
        await this.reload();
      }
    } catch (error) {
      this.toast.error(this.errorText(error));
    } finally {
      this.saving.set(false);
    }
  }

  private enrollmentIdOf(value: unknown): string {
    if (!value || typeof value !== 'object') return '';
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' ? id.trim() : '';
  }

  /** Opens the live confirmation once the write has committed, before leaving the page. */
  private beginConfirmation(
    id: string,
    action: PrintEnrollmentAction,
    reason: string,
  ): void {
    this.confirmationId = id;
    this.confirmationReason = reason;
    this.confirmationAction.set(action);
    this.confirmation.set(null);
    this.confirmationError.set('');
    this.confirmationOpen.set(true);
    void this.loadConfirmation();
  }

  private async loadConfirmation(): Promise<void> {
    if (!this.confirmationId) return;
    const request = ++this.confirmationRequest;
    this.confirmationLoading.set(true);
    this.confirmationError.set('');
    try {
      const record = await this.api.confirmation(this.confirmationId);
      if (request === this.confirmationRequest) this.confirmation.set(record);
    } catch (error) {
      if (request === this.confirmationRequest) {
        this.confirmationError.set(this.errorText(error));
      }
    } finally {
      if (request === this.confirmationRequest) this.confirmationLoading.set(false);
    }
  }

  protected retryConfirmation(): void {
    void this.loadConfirmation();
  }

  protected closeConfirmation(): void {
    if (this.confirmationLoading()) return;
    ++this.confirmationRequest;
    this.confirmationOpen.set(false);
    this.confirmation.set(null);
    void this.router.navigate(['/enrollments']);
  }

  protected async prepareConfirmation(destination: PrintDestination): Promise<void> {
    if (this.confirmationLoading()) return;
    const record = this.confirmation();
    if (!record) return;
    const input = this.confirmationInput(record, this.confirmationAction(), this.confirmationReason);
    ++this.confirmationRequest;
    this.confirmationOpen.set(false);
    await this.router.navigate(['/enrollments']);
    try {
      await this.printDocuments.printEnrollmentConfirmation(input, destination);
    } catch {
      // The print service surfaces the preparation error through its toast.
    }
  }

  /** Builds the printable terms from live enrollment, batch and plan values only. */
  private confirmationInput(
    record: EnrollmentConfirmationRecord,
    action: PrintEnrollmentAction,
    reason: string,
  ): Omit<PrintEnrollmentConfirmationDocument, 'kind' | 'brand'> {
    const enrollment = record.enrollment;
    const batch = record.batch;
    const plan = record.plan;
    const primary = record.guardians.find((guardian) => guardian.is_primary) ?? record.guardians[0];
    const schedule =
      [...batch.batch_days]
        .sort((left, right) => left.day_of_week - right.day_of_week)
        .map((day) => this.dayNames[day.day_of_week])
        .join(', ') || 'Not scheduled';
    const time =
      batch.start_time && batch.end_time
        ? `${batch.start_time.slice(0, 5)} – ${batch.end_time.slice(0, 5)}`
        : undefined;
    const terms: PrintEnrollmentTerm[] = [
      { label: 'Enrollment status', value: enrollment.status },
      { label: 'Billing starts', value: this.printDate(enrollment.valid_from) },
      {
        label: 'Valid until',
        value: enrollment.valid_till ? this.printDate(enrollment.valid_till) : 'No end date',
      },
      { label: 'Batch schedule', value: schedule },
      ...(time ? [{ label: 'Session time', value: time }] : []),
      { label: 'Fee plan', value: plan.name },
      { label: 'Monthly fee', value: this.preferences.money(plan.monthly_fee) },
      ...(Number(plan.registration_fee) > 0
        ? [{ label: 'Registration fee', value: this.preferences.money(plan.registration_fee) }]
        : []),
      ...(plan.duration_months
        ? [
            {
              label: 'Plan duration',
              value: `${plan.duration_months} month${plan.duration_months === 1 ? '' : 's'}`,
            },
          ]
        : []),
      ...(enrollment.notes
        ? [{ label: 'Enrollment notes', value: enrollment.notes }]
        : []),
    ];
    if (action === 'transferred' && record.previousBatch) {
      terms.unshift({
        label: 'Previous batch',
        value: `${record.previousBatch.name} (${record.previousBatch.code})`,
      });
    }
    if (reason) {
      terms.push({
        label: action === 'transferred' ? 'Transfer reason' : 'Change reason',
        value: reason,
      });
    }
    const code = (record.student.student_code || enrollment.id.slice(0, 8))
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '');
    return {
      confirmationNumber: `ENR-${code || 'ENROLLMENT'}`,
      issuedAt: new Date().toISOString(),
      action,
      effectiveOn:
        action === 'created' ? enrollment.valid_from : today(),
      studentName: record.student.full_name,
      studentCode: record.student.student_code,
      studentDateOfBirth: record.student.date_of_birth,
      guardianName: primary?.full_name,
      guardianPhone: primary?.phone,
      guardianRelation: primary?.relation ?? undefined,
      batchName: batch.name,
      batchCode: batch.code,
      batchSchedule: schedule,
      batchTime: time,
      batchCoaches: (batch.batch_coaches ?? [])
        .map((entry) => entry.coach?.full_name)
        .filter((name): name is string => Boolean(name)),
      previousBatchName: record.previousBatch?.name,
      previousBatchCode: record.previousBatch?.code,
      planName: plan.name,
      monthlyFee: Number(enrollment.monthly_fee),
      registrationFee: Number(plan.registration_fee) || undefined,
      durationMonths: plan.duration_months || undefined,
      validFrom: enrollment.valid_from,
      validTill: enrollment.valid_till ?? undefined,
      status: enrollment.status,
      reason: reason || undefined,
      notes: enrollment.notes ?? undefined,
      terms,
    };
  }

  /** Date-only values must be pinned to UTC or a positive timezone shifts them a day back. */
  private printDate(value: string): string {
    const day = String(value ?? '').slice(0, 10);
    if (!day) return '—';
    const date = new Date(`${day}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return day;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  protected changePage(page: number): void { this.page.set(page); void this.reload(); }
  protected filterChanged(): void {
    this.page.set(1);
    void this.reload();
  }
  protected async setPageSize(size: number): Promise<void> {
    this.pageSize.set(size);
    this.page.set(1);
    if (this.view === 'history') await this.loadHistory();
    else await this.reload();
  }
  protected resetFilters(): void {
    this.query.set('');
    this.statusFilter.set('');
    this.batchFilter.set('');
    this.filterChanged();
  }
  protected async applyHistoryFilters(): Promise<void> {
    const value = this.historyForm.getRawValue();
    if (value.from && value.to && value.from > value.to) {
      this.historyError.set('The end date must be on or after the start date.');
      return;
    }
    this.historyFilters = value;
    this.page.set(1);
    await this.loadHistory();
  }
  protected async historyPageChanged(page: number): Promise<void> {
    this.page.set(page);
    await this.loadHistory();
  }
  protected async loadHistory(): Promise<void> {
    const request = ++this.historyLoadId;
    this.historyLoading.set(true);
    this.historyError.set('');
    try {
      const result = await this.api.historyPage(this.historyQuery(), this.page(), this.pageSize());
      if (request === this.historyLoadId) {
        const last = Math.max(1, Math.ceil(result.total / this.pageSize()));
        if (this.page() > last) { this.page.set(last); await this.loadHistory(); return; }
        this.historyRows.set(result.rows);
        this.historyTotal.set(result.total);
      }
    } catch (error) {
      if (request === this.historyLoadId) {
        this.historyRows.set([]);
        this.historyTotal.set(0);
        this.historyError.set(this.errorText(error));
      }
    } finally {
      if (request === this.historyLoadId) this.historyLoading.set(false);
    }
  }
  protected historyAction(row: EnrollmentHistoryRow): string {
    return row.event_type === 'status_changed'
      ? `${row.previous_status} → ${row.new_status}`
      : row.event_type;
  }
  protected readonly enrollmentExportColumns: readonly ExportColumn[] = [
    { key: 'student', label: 'Student' },
    { key: 'batch', label: 'Batch' },
    { key: 'plan', label: 'Fee plan' },
    { key: 'fee', label: 'Monthly fee', align: 'right' },
    { key: 'validity', label: 'Validity' },
    { key: 'status', label: 'Status' },
  ];
  protected readonly historyExportColumns: readonly ExportColumn[] = [
    { key: 'recordedAt', label: 'Recorded at' },
    { key: 'effectiveOn', label: 'Effective date' },
    { key: 'student', label: 'Student' },
    { key: 'action', label: 'Action' },
    { key: 'batch', label: 'Batch' },
    { key: 'performedBy', label: 'Performed by' },
    { key: 'reason', label: 'Reason' },
  ];
  protected readonly exportReference = 'Enrollment list';
  protected readonly historyExportReference = 'Enrollment history';
  /** Reads every filtered enrollment, not just the visible page. */
  protected readonly exportRows = async (): Promise<readonly ExportRow[]> => {
    const rows = await this.lists.all<EnrollmentListRow>('enrollments', {
      ...this.columns.params(),
      search: this.query(),
      status: this.statusFilter(),
      batchId: this.batchFilter(),
    });
    return rows.map((row) => ({
      student: row.student ? `${row.student.full_name} (${row.student.student_code})` : 'Student unavailable',
      batch: row.batch?.name ?? 'Batch unavailable',
      plan: row.plan?.name ?? 'Plan unavailable',
      fee: row.monthly_fee,
      validity: `${formatDate(row.valid_from, 'dd MMM yyyy', 'en-US')} – ${row.valid_till ? formatDate(row.valid_till, 'dd MMM yyyy', 'en-US') : 'No end date'}`,
      status: row.status,
    }));
  };
  /** Reads every filtered history event through the server-side export query. */
  protected readonly exportHistory = async (): Promise<readonly ExportRow[]> => {
    const rows = await this.api.exportHistory(this.historyQuery());
    return rows.map((row) => ({
      recordedAt: formatDate(row.created_at, 'dd MMM yyyy, HH:mm', 'en-US'),
      effectiveOn: formatDate(row.effective_on, 'dd MMM yyyy', 'en-US'),
      student: `${row.enrollment.student.full_name} (${row.enrollment.student.student_code})`,
      action: this.displayAction(row),
      batch: `${row.from_batch?.name ?? '—'} → ${row.to_batch?.name ?? '—'}`,
      performedBy: row.actor?.full_name ?? row.changed_by ?? 'System',
      reason: row.reason || '—',
    }));
  };
  private displayAction(row: EnrollmentHistoryRow): string {
    return this.historyAction(row).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  private errorText(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'The enrollment operation could not be completed.';
  }
}
