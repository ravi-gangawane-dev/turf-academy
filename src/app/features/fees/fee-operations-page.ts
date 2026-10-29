import { FeeViewNavigation } from './fee-view-navigation';
import { TableTools } from '../../shared/data-table/table-tools';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { ServerListService } from '../../core/supabase/server-list.service';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { Pagination } from '../../shared/pagination/pagination';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { FormsModule } from '@angular/forms';
import { PageHero } from '../../shared/page-hero/page-hero';
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
import { ActivatedRoute } from '@angular/router';
import { FeesService } from '../../core/supabase/domain-services';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';

interface Row {
  readonly id?: string;
  readonly name?: string;
  readonly kind?: string;
  readonly value?: number;
  readonly grace_days?: number;
  readonly maximum_amount?: number | null;
  readonly valid_from?: string | null;
  readonly valid_till?: string | null;
  readonly status?: string;
  readonly base_amount?: number;
  readonly discount_amount?: number;
  readonly late_fee_amount?: number;
  readonly final_amount?: number;
  readonly paid_amount?: number;
  readonly balance_amount?: number;
  readonly due_date?: string;
  readonly charge_month?: string;
  readonly student?:
    { readonly full_name?: string } | readonly { readonly full_name?: string }[] | null;
}
@Component({
  selector: 'app-fee-operations-page',
  imports: [FeeViewNavigation, TableTools,
    ColumnFilter,
    Pagination,
    StatusBadge,
    FormsModule,
    PageHero,
    ModalFocus,
    AcademyMoneyPipe,
    DatePipe,
    TitleCasePipe,
    ReactiveFormsModule,
    SummaryMetricCard,
    SortableHeader,
  ],
  templateUrl: './fee-operations-page.html',
  styleUrl: './fee-operations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeeOperationsPage implements OnInit {
  private readonly lists = inject(ServerListService);
  private requestId = 0;
  protected readonly columns=createColumnFilters(()=>this.filterChanged(),()=>{++this.requestId;this.page.set(1);});
  protected readonly total = signal(0);
  private readonly api = inject(FeesService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly dialogs = inject(InteractionDialogService);
  protected readonly view = String(this.route.snapshot.data['feeView'] ?? 'pending');
  protected readonly query = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly month = signal('');
  protected readonly sortBy = signal('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly visibleRows = computed(() => this.rows());
  protected filterChanged(): void { this.page.set(1); void this.reload(); }
  protected changeSortBy(event: Event): void { this.sortBy.set((event.target as HTMLSelectElement).value); this.filterChanged(); }
  protected sortColumn(key: string): void { this.sortDirection.set(this.sortBy() === key ? (this.sortDirection() === 'asc' ? 'desc' : 'asc') : 'asc'); this.sortBy.set(key); this.filterChanged(); }
  protected changeSortDirection(event: Event): void { this.sortDirection.set((event.target as HTMLSelectElement).value === 'desc' ? 'desc' : 'asc'); this.filterChanged(); }
  protected changePage(page: number): void { this.page.set(page); void this.reload(); }
  protected setPageSize(size: number): void { this.pageSize.set(size); this.filterChanged(); }
  protected resetFilters(): void {
    this.query.set('');
    this.statusFilter.set('all');
    this.month.set('');
    this.filterChanged();
  }
  protected close(): void {
    if (!this.saving()) this.dialogOpen.set(false);
  }
  protected readonly rows = signal<readonly Row[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly totals = signal({count: 0, base: 0, discount: 0, late: 0, final: 0, paid: 0, balance: 0});
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    kind: ['fixed', Validators.required],
    value: [0, [Validators.required, Validators.min(0)]],
    graceDays: [0, [Validators.required, Validators.min(0)]],
    maximumAmount: [0, [Validators.min(0)]],
    validFrom: [''],
    validTill: [''],
    status: ['active', Validators.required],
  });
  async ngOnInit(): Promise<void> {
    await this.reload();
  }
  protected open(row?: Row): void {
    if (this.saving()) return;
    this.error.set('');
    this.message.set('');
    this.editingId.set(row ? String(row['id']) : null);
    this.form.reset({
      name: String(row?.['name'] ?? ''),
      kind: String(row?.['kind'] ?? 'fixed'),
      value: Number(row?.['value'] ?? 0),
      graceDays: Number(row?.['grace_days'] ?? 0),
      maximumAmount: Number(row?.['maximum_amount'] ?? 0),
      validFrom: String(row?.['valid_from'] ?? ''),
      validTill: String(row?.['valid_till'] ?? ''),
      status: String(row?.['status'] ?? 'active'),
    });
    this.dialogOpen.set(true);
  }
  protected async save(): Promise<void> {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Enter a name and valid non-negative values.');
      return;
    }
    const value = this.form.getRawValue();
    if (
      !value.name.trim() ||
      !Number.isFinite(value.value) ||
      (value.kind === 'percentage' && value.value > 100) ||
      (this.view === 'late-fees' &&
        (!Number.isInteger(value.graceDays) ||
          (value.maximumAmount != null && !Number.isFinite(value.maximumAmount)))) ||
      (this.view === 'discounts' &&
        value.validFrom &&
        value.validTill &&
        value.validTill < value.validFrom)
    ) {
      this.error.set(
        'Enter a name, a percentage from 0 to 100, whole grace days, and an end date on or after the start date.',
      );
      return;
    }
    this.saving.set(true);
    this.message.set('');
    this.error.set('');
    try {
      const v = this.form.getRawValue();
      if (this.view === 'discounts')
        await this.api.saveDiscount({
          ...(this.editingId() ? { id: this.editingId() } : {}),
          name: v.name.trim(),
          kind: v.kind,
          value: v.value,
          valid_from: v.validFrom || null,
          valid_till: v.validTill || null,
          status: v.status,
        });
      else
        await this.api.saveLateFeeRule({
          ...(this.editingId() ? { id: this.editingId() } : {}),
          name: v.name.trim(),
          kind: v.kind,
          value: v.value,
          grace_days: v.graceDays,
          maximum_amount: v.maximumAmount || null,
          status: v.status,
        });
      this.dialogOpen.set(false);
      this.message.set('Saved successfully.');
      await this.reload();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'The rule could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }
  protected async remove(row: Row): Promise<void> {
    if (this.saving()) return;
    if (
      !(await this.dialogs.confirm(`Delete ${String(row['name'])}?`, 'Delete fee rule', 'Delete'))
    )
      return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      if (this.view === 'discounts') await this.api.deleteDiscount(String(row['id']));
      else await this.api.deleteLateFeeRule(String(row['id']));
      await this.reload();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'The rule could not be deleted.');
    } finally {
      this.saving.set(false);
    }
  }
  protected student(row: Row): string {
    const v = Array.isArray(row.student) ? row.student[0] : row.student;
    return v?.full_name ?? 'Unknown student';
  }
  protected amount(row: Row, key: keyof Row): number {
    return Math.round(Number(row[key] ?? 0) * 100);
  }
  protected text(row: Row, key: keyof Row): string {
    return String(row[key] ?? '');
  }
  private async reload(): Promise<void> {
    const request = ++this.requestId;
    this.loading.set(true); this.error.set('');
    try {
      const resource = this.view === 'discounts' ? 'discounts' : this.view === 'late-fees' ? 'late-fees' : this.view === 'pending' ? 'pending' : 'summary';
      const result = await this.lists.page<Row>(resource, this.page(), this.pageSize(), { ...this.columns.params(), search: this.query(), status: this.statusFilter(), month: this.month(), sortBy: this.sortBy(), sortDirection: this.sortDirection() });
      if (request !== this.requestId) return;
      this.rows.set(result.rows); this.total.set(result.total); this.page.set(result.page); this.totals.set(result.totals);
    } catch (error) {
      if (request !== this.requestId) return;
      this.rows.set([]); this.total.set(0);
      this.totals.set({count: 0, base: 0, discount: 0, late: 0, final: 0, paid: 0, balance: 0});
      this.error.set(error instanceof Error ? error.message : 'Fee data could not be loaded.');
    } finally { if (request === this.requestId) this.loading.set(false); }
  }
}
