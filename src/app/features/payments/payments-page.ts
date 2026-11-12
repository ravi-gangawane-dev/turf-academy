import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import {
  ChargeBalanceRecord,
  FeesService,
  PaymentHistoryRecord,
  PaymentsService,
  RefundReceiptRecord,
} from '../../core/supabase/domain-services';
import { MutationAttempt } from '../../core/supabase/mutation-attempt';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { AsyncState } from '../../shared/async-state/async-state';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { DataTable } from '../../shared/data-table/data-table';
import { TableTools } from '../../shared/data-table/table-tools';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import { PageHero } from '../../shared/page-hero/page-hero';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { PaymentRecordDialog, PaymentRecordDialogValue } from '../../shared/payment-record-dialog/payment-record-dialog';
import { PrintDestination } from '../../shared/print/print-document.models';
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { ToastService } from '../../shared/toast/toast.service';

type PaymentStatus = 'pending' | 'successful' | 'failed' | 'refunded' | 'partially_refunded';
interface PaymentRow {
  readonly id: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly amountPaise: number;
  readonly mode: string;
  readonly status: PaymentStatus;
  readonly paidAt: string;
  readonly reference: string;
  readonly receiptId: string;
  readonly receiptNumber: string;
  readonly receiptPath: string;
  readonly chargeId: string;
  readonly refundablePaise: number;
}
interface ChargeOption {
  readonly id: string;
  readonly studentName: string;
  readonly balancePaise: number;
  readonly period: string;
}

@Component({
  selector: 'app-payments-page',
  imports: [TableTools, PageHero, AsyncState, StatusBadge, ModalFocus, AcademyMoneyPipe, DatePipe, TitleCasePipe, ReactiveFormsModule, FormsModule, RouterLink, DataTable, SummaryMetricCard, ColumnFilter, SortableHeader, PaymentRecordDialog],
  templateUrl: './payments-page.html',
  styleUrl: './payments-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsPage implements OnInit {
  protected readonly columns = createColumnFilters(() => { this.page.set(1); void this.reload(); });
  protected readonly preferences = inject(AcademyPreferencesService);
  private readonly toast = inject(ToastService);
  private readonly paymentAttempt = new MutationAttempt();
  private readonly refundAttempt = new MutationAttempt();
  private loadId = 0;
  private viewReady = false;
  private refundReceiptRequest = 0;
  private readonly paymentsApi = inject(PaymentsService);
  private readonly feesApi = inject(FeesService);
  private readonly printDocuments = inject(PrintDocumentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  protected view = String(this.route.snapshot.data['paymentView'] ?? 'list');
  protected readonly rows = signal<readonly PaymentRow[]>([]);
  protected readonly total = signal(0);
  protected readonly charges = signal<readonly ChargeOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly sortBy = signal<'date' | 'student' | 'amount' | 'status' | 'mode' | 'receipt'>('date');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');
  protected readonly refundPayment = signal<PaymentRow | null>(null);
  protected readonly refundReceiptPayment = signal<PaymentRow | null>(null);
  protected readonly refundReceipts = signal<readonly RefundReceiptRecord[]>([]);
  protected readonly refundReceiptLoading = signal(false);
  protected readonly refundReceiptError = signal('');
  protected readonly refundReceiptRows = computed(() => [...this.refundReceipts()].reverse());
  protected readonly recordDialogOpen = signal(false);
  protected readonly filteredRows = computed(() => this.rows());
  protected readonly pageRows = computed(() => this.rows());
  protected readonly metrics = signal({ total: 0, transactions: 0, receipts: 0, refunded: 0 });
  protected readonly canRefund = computed(() => this.auth.role() === 'admin');
  protected readonly paymentDialogCharges = computed(() => this.charges().map((charge) => ({ ...charge, balanceMinor: charge.balancePaise })));
  protected readonly form = this.fb.nonNullable.group({
    chargeId: ['', Validators.required],
    amountRupees: [0, [Validators.required, Validators.min(0.01)]],
    mode: ['upi', Validators.required],
    providerReference: ['', [Validators.maxLength(100)]],
  });
  protected readonly refundForm = this.fb.nonNullable.group({
    amountRupees: [0, [Validators.required, Validators.min(0.01)]],
    reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
  });

  async ngOnInit(): Promise<void> {
    this.applyQueryView(this.route.snapshot.queryParamMap);
    this.route.queryParamMap.subscribe((params) => this.applyQueryView(params));
    await this.reload();
    this.viewReady = true;
  }
  private applyQueryView(params: ParamMap): void {
    if (this.route.snapshot.data['paymentView'] === 'refunds') return;
    const previousView = this.view;
    const routeView = String(this.route.snapshot.data['paymentView'] ?? 'list');
    this.view = params.get('record') === '1'
      ? 'new'
      : params.get('settlement') === 'partial'
        ? 'partial'
        : params.get('settlement') === 'full'
          ? 'full'
          : params.get('receipt') === '1'
            ? 'receipts'
            : params.get('history') === '1'
              ? 'history'
              : routeView;
    this.search.set(params.get('search') ?? '');
    if (this.viewReady && previousView !== this.view) void this.reload();
  }
  protected chargeChanged(id: string): void {
    const charge = this.charges().find((row) => row.id === id);
    if (charge) this.form.controls.amountRupees.setValue(charge.balancePaise / 100);
  }
  protected async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) return this.form.markAllAsTouched();
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const value = this.form.getRawValue();
      await this.paymentsApi.record(
        value.chargeId,
        Math.round(value.amountRupees * 100) / 100,
        value.mode,
        this.paymentAttempt.key(value),
        value.providerReference.trim() || undefined,
      );
      this.toast.success('Payment recorded and receipt generated.');
      this.paymentAttempt.complete();
      this.form.reset({ chargeId: '', amountRupees: 0, mode: 'upi', providerReference: '' });
      await this.reload();
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Payment could not be recorded.');
    } finally {
      this.saving.set(false);
    }
  }
  protected async submitDialog(value: PaymentRecordDialogValue): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.paymentsApi.record(value.chargeId, value.amount, value.mode, this.paymentAttempt.key(value), value.providerReference || undefined);
      this.paymentAttempt.complete();
      this.toast.success('Payment recorded and receipt generated.');
      this.recordDialogOpen.set(false);
      if (this.view === 'new') {
        this.view = 'list';
        await this.router.navigate(['/payments']);
      }
      await this.reload();
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Payment could not be recorded.');
    } finally { this.saving.set(false); }
  }
  protected openRecordDialog(): void { this.recordDialogOpen.set(true); }
  protected changePage(page: number): void {
    this.page.set(page);
    void this.reload();
  }
  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    void this.reload();
  }
  protected setSearch(value: string): void { this.search.set(value); this.page.set(1); void this.reload(); }
  protected resetFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.sortBy.set('date');
    this.sortDirection.set('desc');
    this.page.set(1);
    void this.reload();
  }
  protected setStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (['all', 'pending', 'successful', 'failed', 'refunded', 'partially_refunded'].includes(value)) {
      this.statusFilter.set(value);
      this.page.set(1);
      void this.reload();
    }
  }
  protected setSortBy(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (['date', 'student', 'amount', 'status', 'mode', 'receipt'].includes(value)) {
      this.sortBy.set(value as 'date' | 'student' | 'amount' | 'status' | 'mode' | 'receipt');
      this.page.set(1);
      void this.reload();
    }
  }
  protected sortColumn(value: string): void {
    if (!['date', 'student', 'amount', 'status', 'mode', 'receipt'].includes(value)) return;
    const key = value as 'date' | 'student' | 'amount' | 'status' | 'mode' | 'receipt';
    this.sortDirection.set(this.sortBy() === key ? (this.sortDirection() === 'asc' ? 'desc' : 'asc') : 'asc');
    this.sortBy.set(key);
    this.page.set(1);
    void this.reload();
  }
  protected setSortDirection(event: Event): void {
    this.sortDirection.set((event.target as HTMLSelectElement).value === 'asc' ? 'asc' : 'desc');
    this.page.set(1);
    void this.reload();
  }
  protected async printReceipt(row: PaymentRow, destination: PrintDestination = 'print'): Promise<void> {
    if (!row.receiptNumber) return;
    this.error.set('');
    try {
      await this.printDocuments.printReceipt(
        {
          receiptNumber: row.receiptNumber,
          studentName: row.studentName,
          studentCode: row.studentCode,
          amount: row.amountPaise / 100,
          paymentMode: row.mode.replaceAll('_', ' '),
          paidAt: row.paidAt,
          reference: row.reference,
          status: row.status,
        },
        destination,
      );
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Receipt could not be prepared.');
    }
  }
  protected async openRefundReceipt(row: PaymentRow): Promise<void> {
    if (!row.receiptNumber) return;
    const request = ++this.refundReceiptRequest;
    this.refundReceiptPayment.set(row);
    this.refundReceipts.set([]);
    this.refundReceiptError.set('');
    this.refundReceiptLoading.set(true);
    try {
      const records = await this.paymentsApi.refundReceipts(row.id);
      if (request !== this.refundReceiptRequest) return;
      this.refundReceipts.set(records);
      if (!records.length) this.refundReceiptError.set('No refunds are recorded for this payment.');
    } catch (error) {
      if (request !== this.refundReceiptRequest) return;
      this.refundReceiptError.set(
        error instanceof Error ? error.message : 'Refund receipts could not be loaded.',
      );
    } finally {
      if (request === this.refundReceiptRequest) this.refundReceiptLoading.set(false);
    }
  }

  protected closeRefundReceipt(): void {
    this.refundReceiptRequest += 1;
    this.refundReceiptPayment.set(null);
    this.refundReceipts.set([]);
    this.refundReceiptLoading.set(false);
    this.refundReceiptError.set('');
  }

  protected async printRefundReceipt(
    record: RefundReceiptRecord,
    destination: PrintDestination = 'print',
  ): Promise<void> {
    this.refundReceiptError.set('');
    try {
      await this.printDocuments.printRefundReceipt(
        {
          refundReceiptNumber: record.refundReceiptNumber,
          originalReceiptNumber: record.originalReceiptNumber,
          studentName: record.studentName,
          studentCode: record.studentCode,
          refundAmount: record.refundAmount,
          originalAmount: record.originalAmount,
          paymentMode: record.paymentMode,
          refundedAt: record.refundedAt,
          paidAt: record.paidAt,
          reason: record.reason,
          reference: record.reference || undefined,
          approvedBy: record.approvedBy,
          batchName: record.batchName,
          period: record.period,
        },
        destination,
      );
    } catch (error) {
      this.refundReceiptError.set(
        error instanceof Error ? error.message : 'Refund receipt could not be prepared.',
      );
    }
  }

  protected openRefund(row: PaymentRow): void {
    if (row.status === 'refunded') return;
    this.refundPayment.set(row);
    this.refundForm.reset({ amountRupees: row.refundablePaise / 100, reason: '' });
    this.refundForm.controls.amountRupees.setValidators([Validators.required, Validators.min(0.01), Validators.max(row.refundablePaise / 100)]);
    this.refundForm.controls.amountRupees.updateValueAndValidity();
  }
  protected async submitRefund(): Promise<void> {
    const row = this.refundPayment();
    if (!row || this.refundForm.invalid || this.saving()) {
      this.refundForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const value = this.refundForm.getRawValue();
      await this.paymentsApi.refund(
        row.id,
        Math.round(value.amountRupees * 100) / 100,
        value.reason.trim(),
        this.refundAttempt.key({ paymentId: row.id, ...value }),
      );
      this.refundAttempt.complete();
      this.refundPayment.set(null);
      this.toast.success('Refund recorded and charge balance recalculated.');
      await this.reload();
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Refund could not be recorded.');
    } finally {
      this.saving.set(false);
    }
  }
  private async reload(): Promise<void> {
    const loadId = ++this.loadId;
    this.loading.set(true);
    this.error.set('');
    try {
      const [paymentPage, charges] = await Promise.all([
        this.paymentsApi.ledgerPage(this.view, this.page(), this.pageSize(), this.route.snapshot.queryParamMap.get('student') ? [this.route.snapshot.queryParamMap.get('student')!] : undefined, { columns: this.columns.params(), search: this.search(), status: this.statusFilter(), sortBy: this.sortBy(), sortDirection: this.sortDirection() }),
        this.feesApi.charges(),
      ]);
      if (loadId !== this.loadId) return;
      this.total.set(paymentPage.total);
      this.metrics.set({ ...paymentPage.metrics, total: Math.round(paymentPage.metrics.total * 100), refunded: Math.round(paymentPage.metrics.refunded * 100) });
      this.rows.set(
        paymentPage.rows.map((row) => {
          const student = this.paymentStudent(row);
          const receipt = this.paymentReceipt(row);
          return {
            id: row.id,
            studentId: row.student_id,
            studentName: student?.full_name ?? 'Unknown student',
            studentCode: student?.student_code ?? '',
            amountPaise: Math.round(Number(row.amount) * 100),
            mode: row.payment_mode,
            status: row.status as PaymentStatus,
            paidAt: row.paid_at,
            reference: row.provider_reference ?? row.client_reference ?? '',
            receiptId: receipt?.id ?? '',
            receiptNumber: receipt?.receipt_number ?? '',
            receiptPath: receipt?.storage_path ?? '',
            chargeId: row.monthly_charge_id ?? '',
            refundablePaise: Math.round((Number(row.amount) - Number(row.refunded_amount ?? 0)) * 100),
          };
        }),
      );
      this.charges.set(
        charges
          .filter((row) => Number(row.balance_amount) > 0)
          .map((row) => ({
            id: row.id,
            studentName: this.chargeStudent(row)?.full_name ?? 'Unknown student',
            balancePaise: Math.round(Number(row.balance_amount) * 100),
            period: row.charge_month.slice(0, 7),
          })),
      );
    } catch (error) {
      if (loadId !== this.loadId) return;
      this.error.set(error instanceof Error ? error.message : 'Payments could not be loaded.');
    } finally {
      if (loadId === this.loadId) this.loading.set(false);
    }
  }
  private paymentStudent(row: PaymentHistoryRecord) {
    return Array.isArray(row.student) ? (row.student[0] ?? null) : row.student;
  }
  private paymentReceipt(row: PaymentHistoryRecord) {
    return Array.isArray(row.receipt) ? (row.receipt[0] ?? null) : row.receipt;
  }
  private chargeStudent(row: ChargeBalanceRecord) {
    return Array.isArray(row.student) ? (row.student[0] ?? null) : row.student;
  }
}
