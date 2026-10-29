import { AttendanceViewNavigation } from './attendance-view-navigation';
import { TableTools } from '../../shared/data-table/table-tools';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { PageHero } from '../../shared/page-hero/page-hero';
import { AsyncState } from '../../shared/async-state/async-state';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Pagination } from '../../shared/pagination/pagination';
import { AcademyFacade } from '../../core/state/academy.facade';
import { ToastService } from '../../shared/toast/toast.service';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { SortableHeader, TableSortDirection } from '../../shared/sortable-header/sortable-header';

interface QueueRow {
  readonly id: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly type: 'Check In' | 'Check Out';
  readonly date: string;
  readonly time: string;
  readonly status: string;
  readonly failureReason: string;
  readonly createdAt: number;
}

type QueueSortKey = 'student' | 'type' | 'date' | 'time' | 'status' | 'reason';

@Component({
  selector: 'app-offline-queue-page',
  imports: [AttendanceViewNavigation, TableTools, PageHero, AsyncState, Pagination, SummaryMetricCard, SortableHeader],
  templateUrl: './offline-queue-page.html',
  styleUrl: './offline-queue-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineQueuePage {
  protected readonly store = inject(AcademyFacade);
  private readonly toast = inject(ToastService);
  protected readonly message = signal('');
  private readonly toastFeedback = effect(() => { const message = this.message(); if (message) this.toast.show(message, /failed|conflict|offline/i.test(message) ? 'warning' : 'success'); });
  protected readonly query = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly sortKey = signal<QueueSortKey>('date');
  protected readonly sortDirection = signal<TableSortDirection>('desc');
  protected readonly localTime = signal(new Date());
  protected readonly deviceName = typeof navigator === 'undefined' ? 'Unknown device' : navigator.userAgent;

  protected readonly rows = computed<readonly QueueRow[]>(() => {
    const query = this.query().trim().toLowerCase();
    const rows = this.store.attendanceOutbox.operations().map((operation): QueueRow => {
      const student = this.store.students().find((item) => item.id === operation.studentId);
      const created = new Date(operation.createdAt);
      return {
        id: operation.id,
        studentName: student?.name ?? operation.studentId,
        studentCode: student?.id ?? operation.studentId,
        type: operation.kind === 'check-in' ? 'Check In' : 'Check Out',
        date: created.toLocaleDateString('en-IN'),
        time: created.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        status: operation.status,
        failureReason: operation.failureReason ?? '',
        createdAt: created.getTime(),
      };
    }).filter((row) => !query || `${row.studentName} ${row.studentCode} ${row.type} ${row.date} ${row.time} ${row.status} ${row.failureReason}`.toLowerCase().includes(query));
    const key = this.sortKey();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return rows.sort((left, right) => {
      const leftValue = key === 'student' ? left.studentName
        : key === 'type' ? left.type
          : key === 'date' || key === 'time' ? left.createdAt
            : key === 'status' ? left.status : left.failureReason;
      const rightValue = key === 'student' ? right.studentName
        : key === 'type' ? right.type
          : key === 'date' || key === 'time' ? right.createdAt
            : key === 'status' ? right.status : right.failureReason;
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * direction;
      }
      return String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base' }) * direction;
    });
  });
  protected readonly pagedRows = computed(() => this.rows().slice((this.page() - 1) * this.pageSize(), this.page() * this.pageSize()));
  protected readonly failed = computed(() => this.store.attendanceOutbox.operations().filter((item) => item.status === 'failed' || item.status === 'conflict').length);
  protected readonly pending = computed(() => this.store.attendanceOutbox.operations().filter((item) => item.status === 'pending' || item.status === 'syncing').length);

  protected setQuery(event: Event): void { this.query.set((event.target as HTMLInputElement).value); this.page.set(1); }
  protected setSort(value: string): void {
    if (!['student', 'type', 'date', 'time', 'status', 'reason'].includes(value)) return;
    const key = value as QueueSortKey;
    if (this.sortKey() === key) this.sortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc');
    else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
    this.page.set(1);
  }
  protected setPageSize(size: number): void { this.pageSize.set(size); this.page.set(1); }
  protected initials(name: string): string { return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); }
  protected formatDate(value: string | null): string { return value ? new Date(value).toLocaleString('en-IN') : 'Not yet'; }
  protected async sync(): Promise<void> { this.message.set('Syncing queued attendance records…'); await this.store.attendanceOutbox.retry(); this.localTime.set(new Date()); this.message.set(this.store.attendanceOutbox.operations().length ? 'Some records still need attention.' : 'All queued attendance records are synchronized.'); }
  protected async retry(id: string): Promise<void> { await this.store.attendanceOutbox.retry(id); }
  protected async discard(id: string): Promise<void> { await this.store.attendanceOutbox.discard(id); }
  protected async clear(): Promise<void> { await this.store.attendanceOutbox.clear(); this.page.set(1); this.message.set('Offline queue cleared.'); }
  protected export(): void { const csv = ['Student,Student ID,Type,Date,Time,Status,Failure reason', ...this.rows().map((row) => [row.studentName, row.studentCode, row.type, row.date, row.time, row.status, row.failureReason].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\r\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'offline-attendance-queue.csv'; link.click(); URL.revokeObjectURL(url); }
}
