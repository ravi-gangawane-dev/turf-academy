import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaymentMode } from '../../core/models/academy.model';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { EnrollmentsService, FeesService, FeeStatementRecord, PaymentsService } from '../../core/supabase/domain-services';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { AsyncState } from '../../shared/async-state/async-state';
import { createColumnFilters } from '../../shared/column-filter/column-filter';
import { DataTable } from '../../shared/data-table/data-table';
import { FeeChargeTable, FeeChargeTableRow } from '../../shared/fee-charge-table/fee-charge-table';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import { PageHero } from '../../shared/page-hero/page-hero';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { PaymentRecordDialog, PaymentRecordDialogValue } from '../../shared/payment-record-dialog/payment-record-dialog';
import {
  PrintDestination,
  PrintInvoiceDocument,
  PrintStatementDocument,
} from '../../shared/print/print-document.models';
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { ToastService } from '../../shared/toast/toast.service';
import { FeeViewNavigation } from './fee-view-navigation';

function statementPeriodValidator(control: AbstractControl): ValidationErrors | null {
  const from = String(control.get('fromDate')?.value ?? '');
  const to = String(control.get('toDate')?.value ?? '');
  return from && to && from > to ? { period: true } : null;
}

interface ChargeListRow {
  readonly id: string;
  readonly studentId: string;
  readonly enrollmentId: string;
  readonly studentName: string;
  readonly batchId: string;
  readonly batchName: string;
  readonly planName: string;
  readonly period: string;
  readonly amountPaise: number;
  readonly discountPaise?: number;
  readonly lateFeePaise?: number;
  readonly paidPaise: number;
  readonly balancePaise: number;
  readonly dueDate: string;
  readonly status: 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'Waived';
}

@Component({
  selector: 'app-fees-page',
  imports: [FeeViewNavigation, PageHero, AsyncState,
    ModalFocus,
    AcademyMoneyPipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    DataTable,
    SummaryMetricCard,
    PaymentRecordDialog,
    FeeChargeTable,
  ],
  templateUrl: './fees-page.html',
  styleUrl: './fees-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeesPage implements OnInit {
  protected readonly columns = createColumnFilters(() => this.resetPage());
  protected readonly sharedChargeRows = computed<readonly FeeChargeTableRow[]>(() => this.pagedRows().map(row => ({
    id: row.id, studentId: row.studentId, studentName: row.studentName, batchName: row.batchName,
    enrollmentId: row.enrollmentId,
    planName: row.planName, period: row.period, amountPaise: row.amountPaise, discountPaise: row.discountPaise ?? 0,
    lateFeePaise: row.lateFeePaise ?? 0, paidPaise: row.paidPaise, balancePaise: row.balancePaise,
    dueDate: row.dueDate, status: row.status,
  })));
  protected readonly preferences = inject(AcademyPreferencesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly printDocuments = inject(PrintDocumentService);
  protected readonly invoiceLoading = signal('');
  protected printInvoice(id: string): Promise<void> {
    return this.renderInvoice(id, 'print');
  }
  protected downloadInvoice(id: string): Promise<void> {
    return this.renderInvoice(id, 'pdf');
  }
  private async renderInvoice(id: string, destination: 'print' | 'pdf'): Promise<void> {
    if (this.invoiceLoading()) return;
    this.invoiceLoading.set(id);
    this.error.set('');
    try {
      const invoice = await this.feesApi.invoice(id);
      if (!invoice) throw new Error('Invoice not found.');
      await this.printDocuments.printInvoice(this.invoiceDocument(invoice), destination);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Invoice could not be prepared.');
    } finally {
      this.invoiceLoading.set('');
    }
  }
  private invoiceDocument(invoice: Record<string, unknown>): Omit<PrintInvoiceDocument, 'kind' | 'brand'> {
    const student = this.first(invoice['student']);
    const enrollment = this.first(invoice['enrollment']);
    const batch = this.first(enrollment?.['batch']);
    const base = Number(invoice['base_amount'] ?? 0);
    const discount = Number(invoice['discount_amount'] ?? 0);
    const lateFee = Number(invoice['late_fee_amount'] ?? 0);
    const reference = 'INV-' + String(invoice['id']).toUpperCase();
    const enrollmentReference = String(invoice['enrollment_id'] ?? '');
    const period = this.periodLabel(invoice['charge_month']);
    const batchName = String(batch?.['name'] ?? '');
    return {
      invoiceNumber: reference,
      issuedAt: new Date().toISOString(),
      dueDate: String(invoice['due_date'] ?? ''),
      studentName: String(student?.['full_name'] ?? 'Student'),
      studentCode: String(student?.['student_code'] ?? ''),
      batchName,
      enrollmentReference,
      period,
      status: String(invoice['status'] ?? ''),
      items: [
        {
          description: `Monthly coaching fee${batchName ? ` — ${batchName}` : ''}`,
          reference: enrollmentReference,
          quantity: 1,
          rate: base,
          amount: base,
        },
        ...(lateFee > 0
          ? [{
            description: 'Late payment fee',
            reference: period,
            quantity: 1,
            rate: lateFee,
            amount: lateFee,
          }]
          : []),
      ],
      totals: {
        subtotal: base,
        discount,
        lateFee,
        total: Number(invoice['final_amount'] ?? 0),
        paid: Number(invoice['paid_amount'] ?? 0),
        balance: Number(invoice['balance_amount'] ?? 0),
      },
    };
  }
  private first(value: unknown): Record<string, unknown> | null {
    if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? null;
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }
  private periodLabel(value: unknown): string {
    const month = String(value ?? '').slice(0, 7);
    if (!month) return '—';
    return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  protected openStatementDialog(row: ChargeListRow): void {
    this.error.set('');
    this.statementStudent.set(row);
    this.statementForm.reset({
      fromDate: this.financialYearStart(),
      toDate: this.preferences.today(),
    });
    this.statementDialogOpen.set(true);
  }

  protected openStatementFromTable(row: FeeChargeTableRow): void {
    const source = this.pagedRows().find(item => item.id === row.id);
    if (source) this.openStatementDialog(source);
  }

  protected openStudentFromTable(row: FeeChargeTableRow): void {
    this.router.navigate(['/students', row.studentId]);
  }

  protected printInvoiceFromTable(row: FeeChargeTableRow): void {
    void this.printInvoice(row.id);
  }
  protected async printStatement(destination: PrintDestination): Promise<void> {
    if (this.statementLoading()) return;
    if (this.statementForm.invalid) {
      this.statementForm.markAllAsTouched();
      return;
    }
    const student = this.statementStudent();
    if (!student) return;
    const { fromDate, toDate } = this.statementForm.getRawValue();
    this.statementLoading.set(true);
    this.error.set('');
    try {
      const statement = await this.feesApi.statement(
        student.studentId,
        fromDate,
        toDate,
        this.preferences.value().timezone,
      );
      this.statementDialogOpen.set(false);
      await this.printDocuments.printStatement(this.statementDocument(statement), destination);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Fee statement could not be prepared.',
      );
    } finally {
      this.statementLoading.set(false);
    }
  }
  private statementDocument(
    statement: FeeStatementRecord,
  ): Omit<PrintStatementDocument, 'kind' | 'brand'> {
    return {
      statementNumber: statement.statementNumber,
      issuedAt: new Date().toISOString(),
      fromDate: statement.fromDate,
      toDate: statement.toDate,
      studentName: statement.studentName,
      studentCode: statement.studentCode,
      batchName: statement.batchName,
      openingBalance: statement.openingBalance,
      closingBalance: statement.closingBalance,
      totalCharges: statement.totalCharges,
      totalPayments: statement.totalPayments,
      totalRefunds: statement.totalRefunds,
      lines: statement.lines,
      ageing: statement.ageing,
    };
  }
  private financialYearStart(): string {
    const today = this.preferences.today();
    const year = Number(today.slice(0, 4));
    const month = Number(today.slice(5, 7));
    return `${month >= 4 ? year : year - 1}-04-01`;
  }
  private readonly paymentsApi = inject(PaymentsService);
  private readonly enrollmentsApi = inject(EnrollmentsService);
  protected readonly receiptNumber = signal('');
  protected readonly enrollmentOptions = signal<readonly { id: string; studentName: string; batchName: string; monthlyFee: number }[]>([]);
  protected readonly optionsLoading = signal(false);
  protected readonly loading = signal(false);
  private loadId = 0;
  private paymentAttempt: { fingerprint: string; reference: string } | null = null;
  private readonly fb = inject(FormBuilder);
  private readonly feesApi = inject(FeesService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(InteractionDialogService);
  protected readonly selectedChargeId = signal('');
  protected readonly statementStudent = signal<ChargeListRow | null>(null);
  protected readonly statementDialogOpen = signal(false);
  protected readonly statementLoading = signal(false);
  protected readonly chargeDialogOpen = signal(false);
  protected readonly query = signal('');
  protected readonly batchFilter = signal('all');
  protected readonly statusFilter = signal('all');
  protected setStatusFilter(value: string): void {
    if (!['all', 'pending', 'partial', 'paid', 'overdue', 'waived'].includes(value)) return;
    this.statusFilter.set(value);
    this.page.set(1);
    void this.loadCharges(false);
  }
  protected readonly sortBy = signal<string>('dueDate');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly total = signal(0);
  protected readonly batchOptions = signal<
    readonly { readonly id: string; readonly name: string }[]
  >([]);
  protected readonly error = signal('');
  protected readonly message = signal('');
  // Action results are announced once, in the corner; load and validation errors stay inline.
  private readonly toastFeedback = effect(() => { const message = this.message(); if (message) this.toast.success(message); });
  protected readonly submitting = signal(false);
  protected readonly paymentForm = this.fb.nonNullable.group({
    amountRupees: [0, [Validators.required, Validators.min(0.01)]],
    mode: ['upi' as PaymentMode, Validators.required],
  });
  protected readonly chargeForm = this.fb.nonNullable.group({
    enrollmentId: ['', Validators.required],
    period: [
      new Date().toISOString().slice(0, 7),
      [Validators.required, Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)],
    ],
    dueDate: [new Date().toISOString().slice(0, 10), Validators.required],
    amountRupees: [0, [Validators.required, Validators.min(0.01)]],
  });
  protected readonly statementForm = this.fb.nonNullable.group(
    {
      fromDate: [this.preferences.today(), Validators.required],
      toDate: [this.preferences.today(), Validators.required],
    },
    { validators: statementPeriodValidator },
  );

  protected readonly rows = signal<readonly ChargeListRow[]>([]);
  protected readonly filteredRows = computed(() => this.rows());
  protected readonly paymentDialogCharges = computed(() => this.rows().filter((row) => row.balancePaise > 0).map((row) => ({
    id: row.id ?? '', studentName: row.studentName, period: row.period, balanceMinor: row.balancePaise,
  })));
  protected readonly pagedRows = computed(() => this.rows());
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly metrics = signal({ students: 0, total: 0, discount: 0, late: 0, paid: 0, pending: 0, overdue: 0 });
  protected changeSortBy(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (['dueDate', 'student', 'period', 'amount', 'balance', 'status'].includes(value)) {
      this.sortBy.set(value as 'dueDate' | 'student' | 'period' | 'amount' | 'balance' | 'status');
      this.resetPage();
    }
  }
  protected sortColumn(value: string): void {
    if (!value.startsWith('cf_') && !['dueDate', 'student', 'period', 'amount', 'balance', 'status'].includes(value)) return;
    const key = value as 'dueDate' | 'student' | 'period' | 'amount' | 'balance' | 'status';
    this.sortDirection.set(this.sortBy() === key ? (this.sortDirection() === 'asc' ? 'desc' : 'asc') : 'asc');
    this.sortBy.set(key);
    this.resetPage();
  }
  protected changeSortDirection(event: Event): void {
    this.sortDirection.set((event.target as HTMLSelectElement).value === 'asc' ? 'asc' : 'desc');
    this.resetPage();
  }

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((params) => {
      const status = params.get('status');
      if (status && ['all', 'pending', 'partial', 'paid', 'overdue', 'waived'].includes(status)) {
        this.statusFilter.set(status);
      }
      if (this.loading()) void this.loadCharges(true);
    });
    await this.loadCharges(true);
  }

  protected selectCharge(chargeId: string, balancePaise: number): void {
    this.selectedChargeId.set(chargeId);
    this.receiptNumber.set('');
    this.message.set('');
    this.error.set('');
    this.paymentForm.controls.amountRupees.setValidators([Validators.required, Validators.min(0.01), Validators.max(balancePaise / 100)]);
    this.paymentForm.controls.amountRupees.setValue(balancePaise / 100);
  }
  protected confirmPay(chargeId: string, balancePaise: number, studentName: string): void {
    const amount = (balancePaise / 100).toFixed(2);
    const confirmed = this.dialogs.confirm(
      `Are you sure you want to record a payment of $${amount} for ${studentName}?`,
      'Confirm Payment',
      'Pay'
    );
    if (!confirmed) return;
    this.selectCharge(chargeId, balancePaise);
  }
  protected async submitPayment(): Promise<void> {
    if (this.submitting()) return;
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    const value = this.paymentForm.getRawValue();
    const chargeId = this.selectedChargeId();
    const amount = Math.round(value.amountRupees * 100) / 100;
    if (!chargeId || !Number.isFinite(amount) || amount <= 0) { this.error.set('Select a charge and enter a valid amount.'); return; }
    const fingerprint = JSON.stringify([chargeId, amount, value.mode]);
    if (this.paymentAttempt?.fingerprint !== fingerprint) this.paymentAttempt = { fingerprint, reference: crypto.randomUUID() };
    this.submitting.set(true);
    this.error.set(''); this.message.set('');
    try {
      const result = await this.paymentsApi.record(chargeId, amount, value.mode, this.paymentAttempt.reference);
      this.receiptNumber.set(result?.receipt?.receipt_number ?? '');
      this.paymentAttempt = null;
      this.selectedChargeId.set('');
      this.message.set('Payment recorded successfully.');
      await this.loadCharges(true);
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Payment could not be recorded.');
    } finally {
      this.submitting.set(false);
    }
  }
  protected async submitSharedPayment(value: PaymentRecordDialogValue): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true); this.error.set(''); this.message.set('');
    try {
      const reference = crypto.randomUUID();
      const result = await this.paymentsApi.record(value.chargeId, value.amount, value.mode, reference, value.providerReference || undefined);
      this.receiptNumber.set(result?.receipt?.receipt_number ?? '');
      this.selectedChargeId.set('');
      this.message.set('Payment recorded successfully.');
      await this.loadCharges(true);
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Payment could not be recorded.');
    } finally { this.submitting.set(false); }
  }
  protected async openChargeDialog(): Promise<void> {
    this.error.set('');
    this.message.set('');
    this.chargeForm.reset({
      enrollmentId: '',
      period: this.preferences.today().slice(0, 7),
      dueDate: this.preferences.today().slice(0, 7) + '-' + String(this.preferences.value().fee_due_day).padStart(2, '0'),
      amountRupees: 0,
    });
    this.chargeDialogOpen.set(true);
    this.optionsLoading.set(true);
    this.enrollmentOptions.set([]);
    try {
      const data = await this.enrollmentsApi.workspace();
      this.enrollmentOptions.set(data.enrollments.filter(row => row.status === 'active').map(row => ({
        id: row.id, studentName: data.students.find(s => s.id === row.student_id)?.full_name ?? 'Student unavailable',
        batchName: data.batches.find(b => b.id === row.batch_id)?.name ?? 'Batch unavailable', monthlyFee: Number(row.monthly_fee),
      })));
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Enrollments could not be loaded.'); }
    finally { this.optionsLoading.set(false); }
  }
  protected enrollmentChanged(id: string): void {
    const enrollment = this.enrollmentOptions().find((item) => item.id === id);
    if (enrollment)
      this.chargeForm.controls.amountRupees.setValue(enrollment.monthlyFee);
  }
  protected chargePeriodChanged(): void { const month = this.chargeForm.controls.period.value; if (/^\d{4}-\d{2}$/.test(month)) this.chargeForm.controls.dueDate.setValue(month + '-' + String(this.preferences.value().fee_due_day).padStart(2, '0')); }
  protected async addCharge(): Promise<void> {
    if (this.submitting() || this.optionsLoading()) return;
    if (this.chargeForm.invalid) {
      this.chargeForm.markAllAsTouched();
      return;
    }
    const value = this.chargeForm.getRawValue();
    this.submitting.set(true); this.error.set(''); this.message.set('');
    try {
      await this.feesApi.createCharge(
        value.enrollmentId,
        value.period,
        value.dueDate,
        Math.round(value.amountRupees * 100) / 100,
      );
      this.chargeDialogOpen.set(false);
      this.message.set('Monthly charge added successfully.');
      this.page.set(1);
      await this.loadCharges(true);
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Monthly charge could not be added.');
    } finally { this.submitting.set(false); }
  }
  protected changePage(value: number): void {
    this.page.set(Math.min(this.pageCount(), Math.max(1, value)));
    void this.loadCharges(false);
  }
  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    void this.loadCharges(false);
  }
  protected resetPage(): void {
    this.page.set(1);
    void this.loadCharges(false);
  }
  protected resetFilters(): void { this.query.set(''); this.batchFilter.set('all'); this.statusFilter.set('all'); this.resetPage(); }

  private async loadCharges(loadReferenceData: boolean): Promise<void> {
    const request = ++this.loadId;
    this.loading.set(true);
    this.error.set('');
    try {
      const [result, summary, batches] = await Promise.all([
        this.feesApi.chargePage(this.page(), this.pageSize(), {
          columns: this.columns.params(),
          search: this.query(),
          batchId: this.batchFilter(),
          status: this.statusFilter(),
          sortBy: this.sortBy(),
          sortDirection: this.sortDirection(),
        }),
        loadReferenceData ? this.feesApi.chargeSummary() : Promise.resolve(null),
        loadReferenceData ? this.feesApi.batchOptions() : Promise.resolve(this.batchOptions()),
      ]);
      if (request !== this.loadId) return;
      this.total.set(result.total);
      if (summary) {
        this.metrics.set({
          students: summary.students,
          total: summary.total * 100,
          discount: 0,
          late: 0,
          paid: 0,
          pending: summary.pending * 100,
          overdue: summary.overdue * 100,
        });
      }
      this.batchOptions.set(batches);
      this.rows.set(
        result.rows.map((row) => ({
          id: row.id,
          studentId: row.student_id,
          enrollmentId: row.enrollment_id,
          studentName: row.student?.full_name ?? 'Unknown student',
          batchId: row.batch_id,
          batchName: row.batch_name,
          planName: row.plan_name ?? 'Not assigned',
          period: row.charge_month,
          amountPaise: Number(row.final_amount) * 100,
          discountPaise: Number(row.discount_amount) * 100,
          lateFeePaise: Number(row.late_fee_amount) * 100,
          paidPaise: Number(row.paid_amount) * 100,
          balancePaise: Number(row.balance_amount) * 100,
          dueDate: row.due_date,
          status: this.displayStatus(row.status),
        })),
      );
      const reconciliation = result.rows.reduce((acc, row) => ({
        discount: acc.discount + Number(row.discount_amount ?? 0),
        late: acc.late + Number(row.late_fee_amount ?? 0),
        paid: acc.paid + Number(row.paid_amount ?? 0),
      }), { discount: 0, late: 0, paid: 0 });
      this.metrics.update(current => ({ ...current, discount: reconciliation.discount * 100, late: reconciliation.late * 100, paid: reconciliation.paid * 100 }));
    } catch (error) {
      if (request !== this.loadId) return;
      this.rows.set([]);
      this.total.set(0);
      this.error.set(
        error instanceof Error ? error.message : 'Monthly charges could not be loaded.',
      );
    } finally { if (request === this.loadId) this.loading.set(false); }
  }

  private displayStatus(status: string): ChargeListRow['status'] {
    return (
      (
        {
          paid: 'Paid',
          partial: 'Partial',
          pending: 'Pending',
          overdue: 'Overdue',
          waived: 'Waived',
        } as const
      )[status as 'paid' | 'partial' | 'pending' | 'overdue' | 'waived'] ?? 'Pending'
    );
  }
}
