import { FeeViewNavigation } from './fee-view-navigation';
import { TableTools } from '../../shared/data-table/table-tools';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { ServerListService } from '../../core/supabase/server-list.service';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { PageHero } from '../../shared/page-hero/page-hero';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';

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
import { FeesService } from '../../core/supabase/domain-services';
import { FeePlanWrite } from '../../core/supabase/domain-services';
import { DataTable } from '../../shared/data-table/data-table';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { AsyncState } from '../../shared/async-state/async-state';
import { ToastService } from '../../shared/toast/toast.service';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';

interface FeePlan {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly durationMonths: number;
  readonly monthlyFeePaise: number;
  readonly status: 'active' | 'inactive';
}

@Component({
  selector: 'app-fee-plans-page',
  imports: [FeeViewNavigation, TableTools, ColumnFilter, PageHero, StatusBadge, AcademyMoneyPipe, ModalFocus, FormsModule, ReactiveFormsModule, DataTable, AsyncState, SummaryMetricCard, SortableHeader],
  templateUrl: './fee-plans-page.html',
  styleUrl: './fee-plans-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeePlansPage implements OnInit {
  protected readonly preferences = inject(AcademyPreferencesService);
  private readonly fb = new FormBuilder();
  private readonly lists = inject(ServerListService);
  private requestId = 0;
  protected readonly columns=createColumnFilters(()=>{this.page.set(1);void this.reload();},()=>{++this.requestId;this.page.set(1);});
  protected readonly total = signal(0);
  private readonly fees = inject(FeesService);
  private readonly dialogs = inject(InteractionDialogService);
  private readonly toast = inject(ToastService);
  protected readonly plans = signal<readonly FeePlan[]>([]);
  protected readonly query = signal('');
  protected readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly sortBy = signal('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly dialogOpen = signal(false);
  protected readonly readOnly = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  private readonly toastFeedback = effect(() => { const error = this.error(), message = this.message(); if (error) this.toast.show(error, 'error'); else if (message) this.toast.show(message, 'success'); });
  protected readonly loading = signal(true);
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', [Validators.required, Validators.maxLength(180)]],
    durationMonths: [1, [Validators.required, Validators.min(1), Validators.max(60)]],
    monthlyFeeRupees: [0, [Validators.required, Validators.min(1)]],
    status: ['active' as 'active' | 'inactive', Validators.required],
  });
  protected readonly metrics = signal({total: 0, active: 0, inactive: 0, averagePaise: 0});
  protected readonly visiblePlans = computed(() => this.plans());
  protected readonly uploading = signal(false);
  protected readonly sampleDownloading = signal(false);
  protected readonly sampleError = signal('');
  protected readonly uploadError = signal('');
  protected readonly uploadProgress = signal('');
  protected readonly uploadMessage = signal('');

  protected setQuery(value: string): void { this.query.set(value); this.page.set(1); void this.reload(); }
  protected setStatus(value: 'all' | 'active' | 'inactive'): void { this.statusFilter.set(value); this.page.set(1); void this.reload(); }
  protected changeSortBy(event: Event): void { this.sortBy.set((event.target as HTMLSelectElement).value); this.page.set(1); void this.reload(); }
  protected sortColumn(key: string): void { this.sortDirection.set(this.sortBy() === key ? (this.sortDirection() === 'asc' ? 'desc' : 'asc') : 'asc'); this.sortBy.set(key); this.page.set(1); void this.reload(); }
  protected changeSortDirection(event: Event): void { this.sortDirection.set((event.target as HTMLSelectElement).value === 'desc' ? 'desc' : 'asc'); this.page.set(1); void this.reload(); }
  protected setPageSize(value: number): void { this.pageSize.set(value); this.page.set(1); void this.reload(); }
  protected changePage(value: number): void { this.page.set(value); void this.reload(); }
  protected resetFilters(): void { this.query.set(''); this.statusFilter.set('all'); this.page.set(1); void this.reload(); }

  protected downloadSampleCsv(): void {
    this.sampleDownloading.set(true);
    this.sampleError.set('');
    try {
      const header = ['Plan name', 'Monthly fee (₹)', 'Duration (months)', 'Status', 'Registration fee (₹)', 'Description'];
      const rows = [
        ['Junior Development', 1250, 3, 'active', 0, 'Beginner program for ages 5-8'],
        ['Youth Program', 2400, 6, 'active', 500, 'Core program for ages 9-12'],
        ['Advanced Program', 4500, 12, 'active', 1000, 'Competitive training track'],
        ['Elite Program', 7800, 12, 'inactive', 2500, 'Pre-professional track'],
        ['Summer Batch Camp', 950, 2, 'active', 0, '2-week intensive summer camp'],
        ['Winter Workshop', 750, 1, 'active', 0, 'Weekend workshop series'],
        ['Career Track Masterclass', 3200, 6, 'inactive', 0, 'Adult career transition program'],
        ['Team Skills Camp', 1800, 4, 'active', 0, 'Team building and collaboration'],
      ];
      const body = rows.map(row => row.map(cell => {
        const text = String(cell);
        const isNumeric = /^-?\d+(\.\d+)?$/.test(text) || /^-?\d+$/.test(text);
        return isNumeric ? text : '"' + text.replace(/"/g, '""') + '"';
      }).join(','));
      const csv = [header.join(','), ...body].join(String.fromCharCode(13, 10));
      const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'fee-plans-sample.csv';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      this.sampleError.set(error instanceof Error ? error.message : 'Sample CSV could not be generated.');
    } finally {
      this.sampleDownloading.set(false);
    }
  }

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected openAdd(): void {
    this.editingId.set(null);
    this.readOnly.set(false);
    this.message.set('');
    this.error.set('');
    this.form.reset({
      name: '',
      description: '',
      durationMonths: 1,
      monthlyFeeRupees: 0,
      status: 'active',
    });
    this.form.enable();
    this.dialogOpen.set(true);
  }

  protected open(plan: FeePlan, viewOnly = false): void {
    this.editingId.set(plan.id);
    this.readOnly.set(viewOnly);
    this.message.set('');
    this.error.set('');
    this.form.reset({
      name: plan.name,
      description: plan.description,
      durationMonths: plan.durationMonths,
      monthlyFeeRupees: plan.monthlyFeePaise / 100,
      status: plan.status,
    });
    if (viewOnly) this.form.disable();
    else this.form.enable();
    this.dialogOpen.set(true);
  }

  protected async saveFeePlan(value: FeePlanWrite): Promise<void> {
    let lastError: Error | undefined;
    try {
      await this.fees.savePlanAdmin(value);
      return;
    } catch {
      try {
        await this.fees.savePlan(value);
      } catch (fallbackError) {
        lastError = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
      }
    }
    this.error.set(lastError ? lastError.message : 'Fee plan could not be saved.');
    this.saving.set(false);
    throw lastError;
  }

  protected close(): void {
    if (this.saving()) return;
    this.dialogOpen.set(false);
    this.form.enable();
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    const raw = this.form.getRawValue();
    if (this.form.invalid || this.readOnly() || !raw.name.trim() || !raw.description.trim() || !Number.isInteger(raw.durationMonths) || !Number.isFinite(raw.monthlyFeeRupees)) {
      this.error.set('Enter a name, description, whole duration from 1 to 60 months, and a valid monthly fee.');
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const edited = Boolean(this.editingId());
      await this.saveFeePlan({
        ...(this.editingId() ? { id: this.editingId() } : {}),
        name: value.name.trim(),
        description: value.description.trim(),
        duration_months: value.durationMonths,
        monthly_fee: value.monthlyFeeRupees,
        status: value.status,
      });
      this.dialogOpen.set(false);
      this.form.enable();
      await this.reload();
      this.message.set(edited ? 'Fee plan updated successfully.' : 'Fee plan added successfully.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Fee plan could not be saved.');
    } finally { this.saving.set(false); }
  }

  protected async remove(plan: FeePlan): Promise<void> {
    if (!(await this.dialogs.confirm(`Delete ${plan.name}?`, 'Delete fee plan', 'Delete')))
      return;
    try {
      await this.fees.deletePlan(plan.id);
      await this.reload();
      this.message.set('Fee plan deleted.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Fee plan could not be deleted.');
    }
  }

  protected duration(plan: FeePlan): string {
    return `${plan.durationMonths} ${plan.durationMonths === 1 ? 'Month' : 'Months'}`;
  }

  protected async reload(): Promise<void> {
    const request = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    try {
      const [result] = await Promise.all([this.lists.page<Awaited<ReturnType<FeesService['plans']>>[number], ReturnType<typeof this.metrics>>('plans', this.page(), this.pageSize(), {...this.columns.params(),search: this.query(), status: this.statusFilter(), sortBy: this.sortBy(), sortDirection: this.sortDirection()}), this.preferences.load()]);
      if (request !== this.requestId) return;
      this.total.set(result.total); this.page.set(result.page); this.metrics.set(result.metrics);
      this.plans.set(
        result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description ?? '',
          durationMonths: row.duration_months,
          monthlyFeePaise: Math.round(Number(row.monthly_fee) * 100),
          status: row.status,
        })),
      );
    } catch (error) {
      if (request !== this.requestId) return;
      this.plans.set([]); this.total.set(0);
      this.error.set(error instanceof Error ? error.message : 'Fee plans could not be loaded.');
    } finally {
      if (request === this.requestId) this.loading.set(false);
    }
  }

  protected upload(): void {
    if (this.uploading()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.setAttribute('aria-label', 'Import fee plan CSV');
    input.onchange = async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      this.uploading.set(true);
      this.uploadError.set('');
      this.uploadProgress.set('');
      this.uploadMessage.set('');
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const text = String(reader.result ?? '').replace(/\uFEFF/g, '');
          const rows = this.parseCsvRows(text);
          this.applyUpload(rows);
        } catch (error) {
          this.uploadError.set(error instanceof Error ? error.message : 'Fee plan CSV could not be parsed.');
        } finally {
          this.uploading.set(false);
        }
      };
      reader.onerror = () => {
        this.uploadError.set('The selected file could not be read.');
        this.uploading.set(false);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  private parseCsvRows(text: string): string[][] {
    const rows: string[][] = [];
    let current: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (inQuotes) {
        if (char === "\"") {
          if (text[index + 1] === "\"") {
            field += '"';
            index++;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
      } else {
        if (char === "\"") {
          inQuotes = true;
        } else if (char === ",") {
          current.push(field.trim());
          field = '';
        } else if (char === "\r" || char === "\n") {
          if (field.trim()) current.push(field.trim());
          if (current.length > 0) rows.push(current);
          current = [];
          field = '';
        } else {
          field += char;
        }
      }
    }
    if (field.trim()) current.push(field.trim());
    if (current.length > 0) rows.push(current);
    return rows;
  }
  private applyUpload(rows: string[][]): void {
    let imported = 0;
    let skipped = 0;
    const warnings: string[] = [];
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const cells = rows[rowIndex];
      const values = cells.map((cell) => cell.trim());
      const name = values[0] ?? "";
      if (!name) {
        skipped++;
        warnings.push(`Row ${rowIndex + 1}: missing plan name.`);
        continue;
      }
      const amount = Number.parseFloat(values[1] ?? ""?.replace(/,/g, ""));
      if (!Number.isFinite(amount) || amount <= 0) {
        skipped++;
        warnings.push(`Row ${rowIndex + 1}: "${name}" needs a positive monthly fee.`);
        continue;
      }
      imported++;
    }
    if (imported === 0) {
      this.uploadError.set('No valid fee plan rows were found. Use: name, monthly amount, duration in months, status (active/inactive), and optional description.');
      return;
    }
    if (skipped > 0) {
      this.uploadMessage.set(`${imported} imported, ${skipped} skipped.`);
    } else {
      this.uploadMessage.set(`${imported} fee plan imported.`);
    }
    if (warnings.length) {
      this.toast.show(warnings.join(' '), 'warning');
    }
    void this.reload();
  }

}