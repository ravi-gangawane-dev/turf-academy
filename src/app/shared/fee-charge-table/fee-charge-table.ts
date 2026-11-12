import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AcademyMoneyPipe } from '../academy-money.pipe';
import { AsyncState } from '../async-state/async-state';
import { StatusBadge } from '../status-badge/status-badge';
import { ColumnFilter } from '../column-filter/column-filter';
import { downloadCsv } from '../data-table/csv';
import { TableTools } from '../data-table/table-tools';
import { SortableHeader } from '../sortable-header/sortable-header';

export interface FeeChargeTableRow {
  readonly id: string;
  readonly studentId: string;
  readonly enrollmentId?: string;
  readonly studentName: string;
  readonly batchName: string;
  readonly planName: string;
  readonly period: string;
  readonly amountPaise: number;
  readonly discountPaise: number;
  readonly lateFeePaise: number;
  readonly paidPaise: number;
  readonly dueDate: string;
  readonly status: string;
  readonly balancePaise: number;
}

@Component({
  selector: 'app-fee-charge-table',
  standalone: true,
  imports: [DatePipe, AcademyMoneyPipe, StatusBadge, AsyncState, ColumnFilter, TableTools, SortableHeader],
  template: `
    @if (showTools) {
      <app-table-tools title="Fees" [table]="chargeTable" [total]="total">
        <button type="button" (click)="resetFilters.emit()">Reset filters</button>
      </app-table-tools>
    } @else {
    <div class="table-tools-actions"><button type="button" title="Export fee charges" (click)="exportRows()"><i class="pi pi-download"></i> Export page</button></div>
    }
    <table #chargeTable class="academy-table">
      <thead><tr><th>#</th><th>@if (showTools) { <app-sortable-header sortKey="student" [activeSort]="sortBy" [direction]="sortDirection" (sortChange)="sortChanged.emit($event)">Student</app-sortable-header> } @else { Student }</th><th>Batch</th><th>Fee plan</th><th>Month</th><th>Charge</th><th>Discount</th><th>Late fee</th><th>Paid</th><th>Outstanding</th><th>Due date</th><th>Status</th><th>Actions</th></tr>
        <tr class="column-filters"><th></th><th><app-column-filter label="student" type="search" [value]="filterValues['student'] || ''" (changed)="filterChanged.emit({ key: 'student', value: $event })" /></th><th><app-column-filter label="batch" type="search" [value]="filterValues['batch'] || ''" (changed)="filterChanged.emit({ key: 'batch', value: $event })" /></th><th><app-column-filter label="fee plan" type="search" [value]="filterValues['plan'] || ''" (changed)="filterChanged.emit({ key: 'plan', value: $event })" /></th><th><app-column-filter label="month" type="month" [value]="filterValues['period'] || ''" (changed)="filterChanged.emit({ key: 'period', value: $event })" /></th><th><app-column-filter label="charge" type="number" [value]="filterValues['amount'] || ''" (changed)="filterChanged.emit({ key: 'amount', value: $event })" /></th><th><app-column-filter label="discount" type="number" [value]="filterValues['discount'] || ''" (changed)="filterChanged.emit({ key: 'discount', value: $event })" /></th><th><app-column-filter label="late fee" type="number" [value]="filterValues['late'] || ''" (changed)="filterChanged.emit({ key: 'late', value: $event })" /></th><th><app-column-filter label="paid" type="number" [value]="filterValues['paid'] || ''" (changed)="filterChanged.emit({ key: 'paid', value: $event })" /></th><th><app-column-filter label="outstanding" type="number" [value]="filterValues['balance'] || ''" (changed)="filterChanged.emit({ key: 'balance', value: $event })" /></th><th><app-column-filter label="due date" type="date" [value]="filterValues['due_date'] || ''" (changed)="filterChanged.emit({ key: 'due_date', value: $event })" /></th><th><app-column-filter label="status" type="search" [value]="filterValues['status'] || ''" (changed)="filterChanged.emit({ key: 'status', value: $event })" /></th><th></th></tr></thead>
      <tbody>
        @if (loading) { <tr><td colspan="13"><app-async-state kind="loading" title="Loading fee records…" /></td></tr> }
        @else { @for (row of rows; track row.id; let index = $index) {
          <tr>
            <td>{{ index + 1 }}</td><td><strong>{{ row.studentName }}</strong></td><td>{{ row.batchName }}</td><td>{{ row.planName }}</td><td>{{ row.period }}</td>
            <td>{{ row.amountPaise / 100 | academyMoney : 'symbol' : '1.2-2' }}</td><td>{{ row.discountPaise / 100 | academyMoney : 'symbol' : '1.2-2' }}</td><td>{{ row.lateFeePaise / 100 | academyMoney : 'symbol' : '1.2-2' }}</td><td>{{ row.paidPaise / 100 | academyMoney : 'symbol' : '1.2-2' }}</td><td>{{ row.balancePaise / 100 | academyMoney : 'symbol' : '1.2-2' }}</td><td>{{ row.dueDate | date: 'dd MMM yyyy' }}</td>
            <td><app-status-badge [status]="row.status" /></td>
            <td class="row-actions"><button class="app-button icon" type="button" title="View student" aria-label="View student" (click)="student.emit(row)"><i class="pi pi-user"></i></button><button class="app-button icon" type="button" title="View fee details" aria-label="View fee details" (click)="details.emit(row)"><i class="pi pi-eye"></i></button><button class="app-button icon" type="button" title="Print invoice" aria-label="Print invoice" (click)="invoice.emit(row)"><i class="pi pi-file"></i></button><button class="app-button icon" type="button" title="Record payment" aria-label="Record payment" [disabled]="row.balancePaise <= 0" (click)="pay.emit(row)"><i class="pi pi-wallet"></i></button></td>
          </tr>
        } @empty { <tr><td colspan="13"><app-async-state kind="empty" title="No fee records found." /></td></tr> } }
      </tbody>
    </table>
  `,
  styles: [`
    :host { display:block; }
    .table-tools-actions { position:absolute; top:-58px; right:20px; display:flex; justify-content:flex-end; padding:0; }
    .table-tools-actions button { display:inline-flex; align-items:center; gap:.45rem; border:1px solid #d8e1db; border-radius:8px; background:#fff; color:#176536; padding:.55rem .8rem; font-weight:600; }
    .row-actions { display:flex; align-items:center; justify-content:center; gap:.35rem; white-space:nowrap; }
    .row-actions button { display:inline-grid; place-items:center; width:34px; height:34px; padding:0; border:1px solid #d8e1db; border-radius:8px; background:#fff; color:#176536; }
    .row-actions button:hover { background:#e8f6ed; border-color:#267d46; }
    @media (max-width: 900px) { .row-actions { flex-wrap:wrap; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeeChargeTable {
  @Input() rows: readonly FeeChargeTableRow[] = [];
  @Input() loading = false;
  @Input() showTools = false;
  @Input() total: number | null = null;
  @Input() sortBy = '';
  @Input() sortDirection: 'asc' | 'desc' = 'asc';
  @Output() sortChanged = new EventEmitter<string>();
  @Output() resetFilters = new EventEmitter<void>();
  @Input() filterValues: Record<string, string> = {};
  @Output() details = new EventEmitter<FeeChargeTableRow>();
  @Output() student = new EventEmitter<FeeChargeTableRow>();
  @Output() invoice = new EventEmitter<FeeChargeTableRow>();
  @Output() pay = new EventEmitter<FeeChargeTableRow>();
  @Output() filterChanged = new EventEmitter<{ key: string; value: string }>();

  protected exportRows(): void {
    downloadCsv('fees-page', [
      ['Student', 'Batch', 'Fee plan', 'Month', 'Charge', 'Discount', 'Late fee', 'Paid', 'Outstanding', 'Due date', 'Status'],
      ...this.rows.map(row => [row.studentName, row.batchName, row.planName, row.period, row.amountPaise / 100, row.discountPaise / 100, row.lateFeePaise / 100, row.paidPaise / 100, row.balancePaise / 100, row.dueDate, row.status]),
    ]);
  }
}
