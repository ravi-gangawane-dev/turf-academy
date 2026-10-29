import { FeeViewNavigation } from './fee-view-navigation';
import { TableTools } from '../../shared/data-table/table-tools';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { PageHero } from '../../shared/page-hero/page-hero';
import { AsyncState } from '../../shared/async-state/async-state';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PaymentMode } from '../../core/models/academy.model';
import { DataTable } from '../../shared/data-table/data-table';
import { AcademySettingsService, EnrollmentsService, FeesService, PaymentsService } from '../../core/supabase/domain-services';
import { createDocumentPdf, downloadDocument } from '../payments/document-pdf';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { ToastService } from '../../shared/toast/toast.service';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';

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
  readonly paidPaise: number;
  readonly balancePaise: number;
  readonly dueDate: string;
  readonly status: 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'Waived';
}

@Component({
  selector: 'app-fees-page',
  imports: [FeeViewNavigation, TableTools, ColumnFilter, PageHero, AsyncState,
    ModalFocus,
    AcademyMoneyPipe,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    DataTable,
    StatusBadge,
    SummaryMetricCard,
    SortableHeader,
  ],
  templateUrl: './fees-page.html',
  styleUrl: './fees-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeesPage implements OnInit {
  protected readonly columns=createColumnFilters(()=>this.resetPage());
  protected readonly preferences = inject(AcademyPreferencesService);
  private readonly settings = inject(AcademySettingsService);
  protected readonly invoiceLoading = signal('');
  protected async downloadInvoice(id:string):Promise<void>{
    if(this.invoiceLoading())return;this.invoiceLoading.set(id);this.error.set('');
    try{
      const [invoice,academy]=await Promise.all([this.feesApi.invoice(id),this.settings.get()]);
      if(!invoice)throw new Error('Invoice not found.');
      const student=Array.isArray(invoice.student)?invoice.student[0]:invoice.student;
      const money=(n:unknown)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:academy.currency_code}).format(Number(n));
      const reference='INV-'+String(invoice.id).toUpperCase();
      const pdf=await createDocumentPdf([academy.academy_name,'Monthly fee invoice',reference,
        'Student: '+(student?.full_name??''),'Student code: '+(student?.student_code??''),
        'Period: '+String(invoice.charge_month).slice(0,7),'Due date: '+invoice.due_date,
        'Base fee: '+money(invoice.base_amount),'Discount: '+money(invoice.discount_amount),'Late fee: '+money(invoice.late_fee_amount),
        'Total: '+money(invoice.final_amount),'Amount paid: '+money(invoice.paid_amount),'Balance due: '+money(invoice.balance_amount),
        'Status: '+invoice.status,academy.contact_email??'',academy.contact_phone??'',academy.address??'']);
      downloadDocument(pdf,reference+'.pdf');
    }catch(e){this.error.set(e instanceof Error?e.message:'Invoice could not be downloaded.');}finally{this.invoiceLoading.set('');}
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
  protected readonly chargeDialogOpen = signal(false);
  protected readonly query = signal('');
  protected readonly batchFilter = signal('all');
  protected readonly statusFilter = signal('all');
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
  private readonly toastFeedback = effect(() => { const error = this.error(); const message = this.message(); if (error) this.toast.show(error, 'error'); else if (message) this.toast.show(message, 'success'); });
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

  protected readonly rows = signal<readonly ChargeListRow[]>([]);
  protected readonly filteredRows = computed(() => this.rows());
  protected readonly pagedRows = computed(() => this.rows());
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly metrics = signal({ students: 0, total: 0, pending: 0, overdue: 0 });
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
      this.error.set(error instanceof Error ? error.message : 'Payment could not be recorded.');
    } finally {
      this.submitting.set(false);
    }
  }
  protected async openChargeDialog(): Promise<void> {
    this.error.set('');
    this.message.set('');
    this.chargeForm.reset({
      enrollmentId: '',
      period: this.preferences.today().slice(0,7),
      dueDate: this.preferences.today().slice(0,7)+'-'+String(this.preferences.value().fee_due_day).padStart(2,'0'),
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
  protected chargePeriodChanged():void{const month=this.chargeForm.controls.period.value;if(/^\d{4}-\d{2}$/.test(month))this.chargeForm.controls.dueDate.setValue(month+'-'+String(this.preferences.value().fee_due_day).padStart(2,'0'));}
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
      this.error.set(error instanceof Error ? error.message : 'Monthly charge could not be added.');
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
        this.feesApi.chargePage(this.page(), this.pageSize(), {columns:this.columns.params(),
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
          paidPaise: Number(row.paid_amount) * 100,
          balancePaise: Number(row.balance_amount) * 100,
          dueDate: row.due_date,
          status: this.displayStatus(row.status),
        })),
      );
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
