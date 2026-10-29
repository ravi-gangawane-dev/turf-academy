import { TableTools } from '../../shared/data-table/table-tools';
import { PageHero } from '../../shared/page-hero/page-hero';
import { AsyncState } from '../../shared/async-state/async-state';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReportDataset, ReportType } from '../../core/models/academy.model';
import {
  BatchesService,
  EnrollmentsService,
  ReportsService,
} from '../../core/supabase/domain-services';
import { reportToCsv } from './report-csv';
import { ToastService } from '../../shared/toast/toast.service';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { sumMoney } from '../../core/supabase/payment-balances';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { Pagination } from '../../shared/pagination/pagination';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';

const isoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const reportPeriodRange = (period: ReportPeriod, now = new Date()): readonly [string, string] => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = today;
  if (period === 'week') {
    const daysSinceMonday = (today.getDay() + 6) % 7;
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceMonday);
  } else if (period === 'month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (period === 'quarter') {
    start = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  } else if (period === 'year') {
    start = new Date(today.getFullYear(), 0, 1);
  }
  return [isoDate(start), isoDate(today)];
};
interface BatchOption {
  readonly id: string;
  readonly name: string;
}
type ReportSelection = ReportType | 'coach' | 'batch';
type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
interface DataRow {
  readonly id?: string;
  readonly name?: string;
  readonly code?: string;
  readonly status?: string;
  readonly capacity?: number;
  readonly batch_coaches?: readonly unknown[];
  readonly coach_name?: string;
  readonly assigned_batches?: number;
  readonly assigned_students?: number;
  readonly scheduled_sessions?: number;
  readonly attendance_records?: number;
  readonly attendance_percent?: number;
  readonly attendance_date?: string;
  readonly charge_month?: string;
  readonly final_amount?: number;
  readonly paid_amount?: number;
  readonly balance_amount?: number;
  readonly valid_from?: string;
  readonly valid_till?: string | null;
  readonly batch_id?: string;
  readonly paid_at?: string;
  readonly payment_mode?: string;
  readonly amount?: number;
  readonly student?: DataRow | readonly DataRow[] | null;
  readonly batch?: DataRow | readonly DataRow[] | null;
  readonly receipt?: DataRow | readonly DataRow[] | null;
  readonly full_name?: string;
  readonly student_code?: string;
  readonly receipt_number?: string;
}
interface ReportChartColumn {
  readonly key: string;
  readonly label: string;
}
interface ReportChartBar {
  readonly label: string;
  readonly value: number;
  readonly height: number;
}
interface ReportChartValue {
  readonly label: string;
  readonly value: number;
}
type ReportChartType = 'bar' | 'line' | 'multiline' | 'pie';
interface ReportChartSeries {
  readonly key: string;
  readonly label: string;
  readonly color: string;
  readonly points: string;
}
interface ReportPieSegment {
  readonly label: string;
  readonly value: number;
  readonly percent: number;
  readonly color: string;
}
interface PrintPieSegment extends ReportPieSegment {
  readonly dashLength: number;
  readonly dashOffset: number;
}
interface GeneratedReportCriteria {
  readonly period: string;
  readonly from: string;
  readonly to: string;
  readonly batch: string;
}

@Component({
  selector: 'app-reports-page',
  imports: [TableTools, PageHero, AsyncState, Pagination, DatePipe, DecimalPipe, ReactiveFormsModule, SummaryMetricCard],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly preferences = inject(AcademyPreferencesService);
  private readonly enrollments = inject(EnrollmentsService);
  private readonly batchApi = inject(BatchesService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(InteractionDialogService);
  protected readonly reportScope = String(
    inject(ActivatedRoute).snapshot.data['reportScope'] ?? '',
  );
  protected get academyName(): string {
    return this.preferences.value().academy_name;
  }
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  private readonly toastFeedback = effect(() => {
    const error = this.error();
    if (error) this.toast.show(error, 'error');
  });
  protected readonly report = signal<ReportDataset | null>(null);
  protected readonly generatedCriteria = signal<GeneratedReportCriteria | null>(null);
  protected readonly printChartIncluded = signal(false);
  protected readonly reportPage = signal(1);
  protected readonly reportPageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly chartVisible = signal(false);
  protected readonly filtersVisible = signal(true);
  protected readonly chartType = signal<ReportChartType>('bar');
  protected readonly chartMetric = signal('');
  protected readonly chartGroup = signal('auto');
  protected readonly batches = signal<readonly BatchOption[]>([]);
  // Kept as a small view-model adapter so the existing template remains
  // stable while its data source is now the Supabase-backed batch service.
  protected readonly store = { batches: this.batches };
  protected readonly form = this.formBuilder.nonNullable.group({
    type: ['attendance' as ReportSelection, Validators.required],
    period: ['today' as ReportPeriod, Validators.required],
    from: [
      reportPeriodRange('today')[0],
      Validators.required,
    ],
    to: [reportPeriodRange('today')[1], Validators.required],
    batchId: [''],
  });

  async ngOnInit(): Promise<void> {
    if (this.reportScope) {
      this.form.controls.type.setValue(this.reportScope as ReportSelection);
      this.form.controls.type.disable();
    }
    this.updateScopeFilters(this.reportScope || this.form.controls.type.value);
    try {
      const [rows] = await Promise.all([this.batchApi.list(), this.preferences.load()]);
      this.batches.set(rows.map((row) => ({ id: String(row['id']), name: String(row['name']) })));
      if (this.reportScope) await this.generate();
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Report filters could not be loaded.',
      );
    }
  }
  protected updateReportType(): void {
    this.updateScopeFilters(this.form.controls.type.value);
  }
  protected updateReportPeriod(): void {
    const period = this.form.controls.period.value;
    if (period !== 'custom') {
      const [from, to] = reportPeriodRange(period);
      this.form.patchValue({ from, to });
    }
    this.updateScopeFilters(this.reportScope || this.form.controls.type.value);
  }
  protected toggleChart(): void {
    this.chartVisible.update((visible) => !visible);
  }
  protected toggleFilters(): void {
    this.filtersVisible.update((visible) => !visible);
  }
  protected get paginatedRows(): ReportDataset['rows'] {
    const rows = this.report()?.rows ?? [];
    const start = (this.reportPage() - 1) * this.reportPageSize();
    return rows.slice(start, start + this.reportPageSize());
  }
  protected changeReportPage(page: number): void {
    const total = this.report()?.rows.length ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / this.reportPageSize()));
    this.reportPage.set(Math.min(pageCount, Math.max(1, page)));
  }
  protected changeReportPageSize(size: number): void {
    this.reportPageSize.set(size);
    this.reportPage.set(1);
  }
  protected updateChartMetric(event: Event): void {
    const select = event.target;
    if (select instanceof HTMLSelectElement) this.chartMetric.set(select.value);
  }
  protected updateChartType(event: Event): void {
    const select = event.target;
    if (
      select instanceof HTMLSelectElement &&
      ['bar', 'line', 'multiline', 'pie'].includes(select.value)
    ) {
      this.chartType.set(select.value as ReportChartType);
    }
  }
  protected updateChartGroup(event: Event): void {
    const select = event.target;
    if (select instanceof HTMLSelectElement) this.chartGroup.set(select.value);
  }
  protected get chartColumns(): readonly ReportChartColumn[] {
    const report = this.report();
    if (!report) return [];
    const numericColumns = report.columns.filter((column) =>
      report.rows.some((row) => this.numericValue(row[column.key]) !== null),
    );
    return numericColumns.length ? numericColumns : [{ key: '__count', label: 'Record count' }];
  }
  protected get selectedChartColumn(): ReportChartColumn | undefined {
    const columns = this.chartColumns;
    return columns.find((column) => column.key === this.chartMetric()) ?? columns[0];
  }
  protected get chartGroupColumns(): readonly ReportChartColumn[] {
    const report = this.report();
    if (!report) return [];
    const numericKeys = new Set(this.chartColumns.map((column) => column.key));
    return report.columns.filter((column) => !numericKeys.has(column.key));
  }
  protected get selectedChartGroup(): ReportChartColumn | undefined {
    const columns = this.chartGroupColumns;
    if (this.chartGroup() === '') return undefined;
    if (this.chartGroup() !== 'auto') {
      return columns.find((column) => column.key === this.chartGroup());
    }
    const report = this.report();
    const preferred =
      report?.title === 'Batch report'
        ? ['name', 'status', 'batch']
        : report?.title === 'Coach performance report'
          ? ['coach', 'name', 'status']
          : ['status', 'date', 'period', 'mode', 'batch', 'coach', 'name'];
    return (
      preferred.map((key) => columns.find((column) => column.key === key)).find(Boolean) ??
      columns[0]
    );
  }
  protected get chartBars(): readonly ReportChartBar[] {
    const column = this.selectedChartColumn;
    if (!column) return [];
    const rows = this.aggregateChartValues(column.key);
    const max = Math.max(0, ...rows.map((row) => Math.abs(row.value)));
    return rows.map((row) => ({
      ...row,
      height: max > 0 ? Math.max(2, (Math.abs(row.value) / max) * 100) : 2,
    }));
  }
  private aggregateChartValues(key: string): readonly ReportChartValue[] {
    const report = this.report();
    if (!report) return [];
    const group = this.selectedChartGroup;
    const totals = new Map<string, number>();
    report.rows.forEach((row, index) => {
      const label = group ? String(row[group.key] ?? 'Unknown') : `Row ${index + 1}`;
      const value = key === '__count' ? 1 : this.numericValue(row[key]);
      if (value === null) return;
      totals.set(label, (totals.get(label) ?? 0) + value);
    });
    return [...totals].map(([label, value]) => ({ label, value }));
  }
  protected get chartSeries(): readonly ReportChartSeries[] {
    const columns =
      this.chartType() === 'multiline'
        ? this.chartColumns
        : this.selectedChartColumn
          ? [this.selectedChartColumn]
          : [];
    const values = columns.flatMap((column) =>
      this.aggregateChartValues(column.key).map((item) => item.value),
    );
    if (!values.length) return [];
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const range = max - min || 1;
    return columns.map((column, seriesIndex) => {
      const groupedValues = this.aggregateChartValues(column.key);
      const points = groupedValues
        .map((item, index) => {
          const x = groupedValues.length > 1
            ? 40 + (index / (groupedValues.length - 1)) * (this.lineChartWidth - 80)
            : this.lineChartWidth / 2;
          const y = 210 - ((item.value - min) / range) * 180;
          return `${x},${y}`;
        })
        .join(' ');
      return {
        key: column.key,
        label: column.label,
        color: this.chartColors[seriesIndex % this.chartColors.length],
        points,
      };
    });
  }
  protected get chartLabels(): readonly string[] {
    const key = this.selectedChartColumn?.key;
    return key ? this.aggregateChartValues(key).map((item) => item.label) : [];
  }
  protected get lineChartWidth(): number {
    const points = this.chartLabels.length;
    return Math.max(540, Math.max(1, points - 1) * 90 + 80);
  }
  protected get pieSegments(): readonly ReportPieSegment[] {
    const totalRows = this.chartBars.filter((bar) => bar.value >= 0);
    const total = totalRows.reduce((sum, bar) => sum + bar.value, 0);
    if (!total) return [];
    return totalRows.map((bar, index) => ({
      label: bar.label,
      value: bar.value,
      percent: (bar.value / total) * 100,
      color: this.chartColors[index % this.chartColors.length],
    }));
  }
  protected get printPieSegments(): readonly PrintPieSegment[] {
    const circumference = 2 * Math.PI * 90;
    let offset = 0;
    return this.pieSegments.map((segment) => {
      const dashLength = circumference * (segment.percent / 100);
      const result = { ...segment, dashLength, dashOffset: -offset };
      offset += dashLength;
      return result;
    });
  }
  private get hasPlottedChart(): boolean {
    if (!this.chartVisible()) return false;
    if (this.chartType() === 'pie') return this.pieSegments.length > 0;
    if (this.chartType() === 'multiline') return this.chartSeries.length > 1;
    return this.chartBars.length > 0;
  }
  protected get pieGradient(): string {
    let offset = 0;
    const stops = this.pieSegments.map((segment) => {
      const start = offset;
      offset += segment.percent;
      return `${segment.color} ${start}% ${offset}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }
  private readonly chartColors = ['#277d47', '#3478c5', '#e29b32', '#9459b8', '#d45d5d', '#239b9b'];
  private numericValue(value: string | number | undefined): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (
      typeof value !== 'string' ||
      !/^-?(?:[A-Z]{1,3}\s*)?[$₹€£]?\s*[\d,]+(?:\.\d+)?%?$/i.test(value.trim())
    ) return null;
    const parsed = Number(value.replace(/[A-Z$₹€£,\s]/gi, '').replace(/%$/, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  private updateScopeFilters(selection: ReportSelection | string): void {
    const dateRangeEnabled = selection !== 'batch' && this.form.controls.period.value === 'custom';
    if (dateRangeEnabled) {
      this.form.controls.from.enable();
      this.form.controls.to.enable();
    } else {
      this.form.controls.from.disable();
      this.form.controls.to.disable();
    }
    if (selection === 'coach') this.form.controls.batchId.disable();
    else this.form.controls.batchId.enable();
  }
  private scopedDataset(batches: readonly DataRow[], scope: string): ReportDataset {
    if (scope === 'batch') {
      const rows = batches.map((batch) => ({
        name: String(batch['name']),
        code: String(batch['code'] ?? ''),
        status: String(batch['status']),
        capacity: Number(batch['capacity'] ?? 0),
        coaches: Array.isArray(batch['batch_coaches']) ? batch['batch_coaches'].length : 0,
      }));
      return this.dataset(
        'enrollment',
        'Batch report',
        [
          { key: 'name', label: 'Batch' },
          { key: 'code', label: 'Code' },
          { key: 'status', label: 'Status' },
          { key: 'capacity', label: 'Capacity' },
          { key: 'coaches', label: 'Assigned coaches' },
        ],
        rows,
        [
          { label: 'Batches', value: String(rows.length) },
          { label: 'Active', value: String(rows.filter((row) => row.status === 'active').length) },
        ],
      );
    }
    return this.dataset('attendance', 'Coach report', [], [], []);
  }
  private coachDataset(records: readonly DataRow[]): ReportDataset {
    const rows = records.map((row) => ({
      coach: String(row['coach_name']),
      assignedBatches: Number(row['assigned_batches']),
      assignedStudents: Number(row['assigned_students']),
      sessions: Number(row['scheduled_sessions']),
      attendance: Number(row['attendance_records']),
      attendancePercent: `${Number(row['attendance_percent']).toFixed(1)}%`,
    }));
    return this.dataset(
      'attendance',
      'Coach performance report',
      [
        { key: 'coach', label: 'Coach' },
        { key: 'assignedBatches', label: 'Batches' },
        { key: 'assignedStudents', label: 'Students' },
        { key: 'sessions', label: 'Sessions' },
        { key: 'attendance', label: 'Attendance records' },
        { key: 'attendancePercent', label: 'Attendance' },
      ],
      rows,
      [
        { label: 'Coaches', value: String(rows.length) },
        {
          label: 'Assigned students',
          value: String(rows.reduce((sum, row) => sum + row.assignedStudents, 0)),
        },
        { label: 'Sessions', value: String(rows.reduce((sum, row) => sum + row.sessions, 0)) },
      ],
    );
  }
  protected async generate(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    const value = this.form.getRawValue();
    const scope = this.reportScope || (value.type === 'coach' || value.type === 'batch' ? value.type : '');
    const [from, to] =
      value.period === 'custom' ? [value.from, value.to] : reportPeriodRange(value.period);
    if (scope !== 'batch' && from > to) {
      this.error.set('The start date must be before the end date.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.report.set(null);
    this.reportPage.set(1);
    try {
      await this.preferences.load();
      if (scope === 'batch') {
        const batches = (await this.batchApi.list()) as readonly DataRow[];
        this.setGeneratedReport(
          this.scopedDataset(
            batches.filter((batch) => !value.batchId || batch.id === value.batchId),
            scope,
          ),
          value.period,
          from,
          to,
          value.batchId,
        );
        return;
      }
      if (scope === 'coach') {
        this.setGeneratedReport(
          this.coachDataset(
            (await this.reports.coaches(from, to)) as readonly DataRow[],
          ),
          value.period,
          from,
          to,
          value.batchId,
        );
        return;
      }
      this.setGeneratedReport(
        await this.loadDataset(value.type as ReportType, from, to, value.batchId || undefined),
        value.period,
        from,
        to,
        value.batchId,
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Report could not be generated.');
    } finally {
      this.loading.set(false);
    }
  }
  private setGeneratedReport(
    report: ReportDataset,
    period: ReportPeriod,
    from: string,
    to: string,
    batchId: string,
  ): void {
    const batch = this.batches().find((item) => item.id === batchId);
    this.report.set(report);
    this.generatedCriteria.set({
      period: report.title === 'Batch report'
        ? 'Current directory'
        : period === 'custom'
          ? 'Custom date range'
          : `This ${period}`,
      from,
      to,
      batch: batch?.name ?? 'All batches',
    });
  }
  private async loadDataset(
    type: ReportType,
    from: string,
    to: string,
    batchId?: string,
  ): Promise<ReportDataset> {
    if (type === 'attendance') {
      const records = (await this.reports.attendance(from, to, batchId)) as readonly DataRow[];
      const rows = records.map((row) => ({
        date: String(row['attendance_date']),
        student: this.related(row, 'student', 'full_name'),
        code: this.related(row, 'student', 'student_code'),
        batch: this.related(row, 'batch', 'name'),
        status: String(row['status']),
      }));
      return this.dataset(
        type,
        'Attendance report',
        [
          { key: 'date', label: 'Date' },
          { key: 'student', label: 'Student' },
          { key: 'code', label: 'Student ID' },
          { key: 'batch', label: 'Batch' },
          { key: 'status', label: 'Status' },
        ],
        rows,
        [
          { label: 'Records', value: String(rows.length) },
          {
            label: 'Present',
            value: String(rows.filter((row) => ['present', 'checked_out'].includes(row.status)).length),
          },
          { label: 'Absent', value: String(rows.filter((row) => row.status === 'absent').length) },
          { label: 'Late', value: String(rows.filter((row) => row.status === 'late').length) },
        ],
      );
    }
    if (type === 'fees' || type === 'pending') {
      const filtered = (await this.reports.charges(from, to, batchId, type === 'pending')) as readonly DataRow[];
      const rows = filtered.map((row) => ({
        student: this.related(row, 'student', 'full_name'),
        period: String(row['charge_month']).slice(0, 7),
        charge: this.money(row['final_amount']),
        paid: this.money(row['paid_amount']),
        balance: this.money(row['balance_amount']),
        status: String(row['status']),
      }));
      return this.dataset(
        type,
        type === 'pending' ? 'Pending balances' : 'Fee collection report',
        [
          { key: 'student', label: 'Student' },
          { key: 'period', label: 'Period' },
          { key: 'charge', label: 'Charge' },
          { key: 'paid', label: 'Paid' },
          { key: 'balance', label: 'Balance' },
          { key: 'status', label: 'Status' },
        ],
        rows,
        [
          { label: 'Records', value: String(rows.length) },
          {
            label: 'Outstanding',
            value: this.money(
              sumMoney(filtered.map(row => Number(row['balance_amount'] ?? 0))),
            ),
          },
        ],
      );
    }
    if (type === 'enrollment') {
      const records = (await this.enrollments.list()) as readonly DataRow[];
      const filtered = records.filter(
        (row) =>
          String(row['valid_from']) <= to &&
          (!row['valid_till'] || String(row['valid_till']) >= from) &&
          (!batchId || String(row['batch_id']) === batchId),
      );
      const rows = filtered.map((row) => ({
        student: this.related(row, 'student', 'full_name'),
        batch: this.related(row, 'batch', 'name'),
        from: String(row['valid_from']),
        until: String(row['valid_till'] ?? '—'),
        status: String(row['status']),
      }));
      return this.dataset(
        type,
        'Enrollment report',
        [
          { key: 'student', label: 'Student' },
          { key: 'batch', label: 'Batch' },
          { key: 'from', label: 'From' },
          { key: 'until', label: 'Until' },
          { key: 'status', label: 'Status' },
        ],
        rows,
        [
          { label: 'Enrollments', value: String(rows.length) },
          { label: 'Active', value: String(rows.filter((row) => row.status === 'active').length) },
        ],
      );
    }
    const records = await this.reports.collections(from, to, batchId);
    const rows = records.map((row) => ({
      date: String(row['paid_at']).slice(0, 10),
      student: this.related(row, 'student', 'full_name'),
      receipt: this.related(row, 'receipt', 'receipt_number'),
      mode: String(row['payment_mode']),
      gross: this.money(row.amount),
      refunded: this.money(row.refunded_amount),
      amount: this.money(row.net_amount),
    }));
    return this.dataset(
      type,
      'Revenue report',
      [
        { key: 'date', label: 'Date' },
        { key: 'student', label: 'Student' },
        { key: 'receipt', label: 'Receipt' },
        { key: 'mode', label: 'Mode' },
        { key: 'gross', label: 'Gross collected' },
        { key: 'refunded', label: 'Refunded' },
        { key: 'amount', label: 'Net collected' },
      ],
      rows,
      [
        { label: 'Payments', value: String(rows.length) },
        {
          label: 'Gross collected',
          value: this.money(sumMoney(records.map(row => row.amount))),
        },
        { label: 'Refunded', value: this.money(sumMoney(records.map(row => row.refunded_amount))) },
        { label: 'Net collected', value: this.money(sumMoney(records.map(row => row.net_amount))) },
      ],
    );
  }
  private dataset(
    type: ReportType,
    title: string,
    columns: ReportDataset['columns'],
    rows: ReportDataset['rows'],
    summary: ReportDataset['summary'],
  ): ReportDataset {
    return { type, title, generatedAt: new Date().toISOString(), columns, rows, summary };
  }
  private related(
    row: DataRow,
    relation: 'student' | 'batch' | 'receipt',
    key: 'full_name' | 'student_code' | 'name' | 'receipt_number',
  ): string {
    const value = row[relation];
    if (Array.isArray(value)) return String((value[0] as DataRow | undefined)?.[key] ?? '');
    return value && typeof value === 'object' ? String((value as DataRow)[key] ?? '') : '';
  }
  private money(value: unknown): string {
    return this.preferences.money(Number(value ?? 0));
  }
  protected exportCsv(): void {
    const report = this.report();
    if (!report) return;
    const csv = reportToCsv(report);
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.reportScope === 'batch'
      ? 'batch-report.csv'
      : `${this.reportScope || report.type}-${this.form.controls.from.value}-to-${this.form.controls.to.value}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  protected viewReportDetail(row: ReportDataset['rows'][number]): void {
    const studentName = row['student'] || 'Unknown';
    const period = row['period'] || 'Unknown';
    const charge = row['charge'] || 0;
    const paid = row['paid'] || 0;
    const balance = row['balance'] || 0;
    const status = row['status'] || 'Unknown';
    const details = `Student: ${studentName}\nPeriod: ${period}\nCharge: ${charge}\nPaid: ${paid}\nBalance: ${balance}\nStatus: ${status}`;
    this.dialogs.confirm(details, 'Report Details', 'Close');
  }
  protected async print(): Promise<void> {
    const includeChart = this.hasPlottedChart
      ? await this.dialogs.confirm(
          'Would you like to include the displayed chart in the printed report?',
          'Print report',
          'Yes',
          'No',
        )
      : false;
    this.printChartIncluded.set(includeChart);
    const restoreScreenState = () => {
      this.printChartIncluded.set(false);
    };
    window.addEventListener('afterprint', restoreScreenState, { once: true });
    requestAnimationFrame(() => window.print());
  }
}
