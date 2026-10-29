import { PaymentViewNavigation } from './payment-view-navigation';
import { TableTools } from '../../shared/data-table/table-tools';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { PageHero } from '../../shared/page-hero/page-hero';
import { AsyncState } from '../../shared/async-state/async-state';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ChargeBalanceRecord,
  FeesService,
  PaymentHistoryRecord,
  PaymentsService,
} from '../../core/supabase/domain-services';
import { DataTable } from '../../shared/data-table/data-table';
import { StorageService } from '../../core/supabase/storage.service';
import { createReceiptPdf } from './receipt-pdf';
import { MutationAttempt } from '../../core/supabase/mutation-attempt';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
import { FormsModule } from '@angular/forms';

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
  imports: [PaymentViewNavigation, TableTools, PageHero, AsyncState, StatusBadge, ModalFocus, AcademyMoneyPipe, DatePipe, TitleCasePipe, ReactiveFormsModule, FormsModule, RouterLink, DataTable, SummaryMetricCard, ColumnFilter, SortableHeader],
  templateUrl: './payments-page.html',
  styleUrl: './payments-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsPage implements OnInit {
  protected readonly columns=createColumnFilters(()=>{this.page.set(1);void this.reload();});
  protected readonly preferences = inject(AcademyPreferencesService);
  private readonly paymentAttempt = new MutationAttempt();
  private readonly refundAttempt = new MutationAttempt();
  private loadId = 0;
  private readonly paymentsApi = inject(PaymentsService);
  private readonly feesApi = inject(FeesService);
  private readonly storage = inject(StorageService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  protected readonly view = String(this.route.snapshot.data['paymentView'] ?? 'list');
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
  protected readonly filteredRows = computed(() => this.rows());
  protected readonly pageRows = computed(() => this.rows());
  protected readonly metrics = signal({ total: 0, transactions: 0, receipts: 0, refunded: 0 });
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
    await this.reload();
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
      this.message.set('Payment recorded and receipt generated.');
      this.paymentAttempt.complete();
      this.form.reset({ chargeId: '', amountRupees: 0, mode: 'upi', providerReference: '' });
      await this.reload();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Payment could not be recorded.');
    } finally {
      this.saving.set(false);
    }
  }
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
  protected async printReceipt(row: PaymentRow): Promise<void> {
    if (!row.receiptId || !row.receiptNumber) return;
    this.error.set('');
    try {
      let path = row.receiptPath;
      if (!path) {
        const blob = createReceiptPdf({
          currencyCode: this.preferences.currency(),
          academyName: this.preferences.value().academy_name,
          timezone: this.preferences.value().timezone,
          receiptNumber: row.receiptNumber,
          studentName: row.studentName,
          studentCode: row.studentCode,
          amountPaise: row.amountPaise,
          paymentMode: row.mode,
          paidAt: row.paidAt,
        });
        const file = new File([blob], `${row.receiptNumber}.pdf`, { type: 'application/pdf' });
        path = await this.storage.upload('receipts', row.studentId, file);
        try {
          await this.paymentsApi.saveReceiptPath(row.receiptId, path);
        } catch (error) {
          await this.storage.remove('receipts', path).catch(() => undefined);
          throw error;
        }
        await this.reload();
      }
      const url = await this.storage.signedUrl('receipts', path, 120);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Receipt could not be generated.');
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
      this.message.set('Refund recorded and charge balance recalculated.');
      await this.reload();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Refund could not be recorded.');
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
        this.paymentsApi.ledgerPage(this.view, this.page(), this.pageSize(), this.route.snapshot.queryParamMap.get('student') ? [this.route.snapshot.queryParamMap.get('student')!] : undefined, { columns:this.columns.params(),search: this.search(), status: this.statusFilter(), sortBy: this.sortBy(), sortDirection: this.sortDirection() }),
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
