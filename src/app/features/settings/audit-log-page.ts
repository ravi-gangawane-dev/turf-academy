import { TableTools } from '../../shared/data-table/table-tools';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
import { PageHero } from '../../shared/page-hero/page-hero';
import { DataRequestError } from '../../core/supabase/data-error';
import { DatePipe } from '@angular/common';
import { Pagination } from '../../shared/pagination/pagination';
import { AsyncState } from '../../shared/async-state/async-state';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DatabaseService } from '../../core/supabase/database.service';
interface AuditEvent {
  id: number;
  action: string;
  table_name: string;
  record_id: string;
  occurred_at: string;
  actor_id: string | null;
}
type AuditSort = 'occurred_at' | 'action' | 'table_name' | 'record_id' | 'actor_id';
interface AuditFilters {
  date: string;
  action: string;
  table: string;
  record: string;
  account: string;
}
const emptyFilters = (): AuditFilters => ({
  date: '',
  action: '',
  table: '',
  record: '',
  account: '',
});

@Component({
  selector: 'app-audit-log-page',
  imports: [TableTools,
    SortableHeader,
    PageHero,
    Pagination,
    AsyncState,
    DatePipe,
    FormsModule,
    RouterLink,
    RouterLinkActive,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:'./audit-log-page.html',
  styleUrl:'./audit-log-page.scss',
})
export class AuditLogPage implements OnInit, OnDestroy {
  private readonly db = inject(DatabaseService);
  private request = 0;
  private filterTimer?: ReturnType<typeof setTimeout>;
  protected filters = emptyFilters();
  private appliedFilters = emptyFilters();
  protected sortBy: AuditSort = 'occurred_at';
  protected sortDirection: 'asc' | 'desc' = 'desc';
  protected readonly rows = signal<AuditEvent[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  async ngOnInit() {
    await this.load(1);
  }
  ngOnDestroy(): void {
    this.cancelFilterTimer();
    ++this.request;
  }
  private cancelFilterTimer(): void {
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.filterTimer = undefined;
  }
  protected scheduleFilters(): void {
    this.cancelFilterTimer();
    ++this.request;
    this.page.set(1);
    this.loading.set(true);
    this.filterTimer = setTimeout(() => void this.load(1), 250);
  }
  protected async sortColumn(key: AuditSort): Promise<void> {
    this.sortDirection = this.sortBy === key && this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortBy = key;
    await this.load(1);
  }
  protected async resetFilters(): Promise<void> {
    this.filters = emptyFilters();
    this.sortBy = 'occurred_at';
    this.sortDirection = 'desc';
    await this.load(1);
  }
  private async query(
    offset: number,
    limit: number,
    filters: AuditFilters,
    sortBy: AuditSort,
    sortDirection: 'asc' | 'desc',
  ) {
    const result = await this.db.client.rpc('get_audit_log_page', {
      p_offset: offset,
      p_limit: limit,
      p_filters: filters,
      p_sort_by: sortBy,
      p_sort_direction: sortDirection,
    });
    return {
      data: (result.data?.rows ?? []) as AuditEvent[],
      count: Number(result.data?.total ?? 0),
      error: result.error,
    };
  }
  protected async setPageSize(size: number): Promise<void> {
    this.pageSize.set(size);
    await this.load(1);
  }
  protected async load(page: number): Promise<void> {
    this.cancelFilterTimer();
    const request = ++this.request;
    this.appliedFilters = Object.fromEntries(
      Object.entries(this.filters).map(([key, value]) => [key, value.trim()]),
    ) as unknown as AuditFilters;
    this.loading.set(true);
    this.error.set('');
    try {
      const r = await this.query(
        (page - 1) * this.pageSize(),
        this.pageSize(),
        { ...this.appliedFilters },
        this.sortBy,
        this.sortDirection,
      );
      if (request !== this.request) return;
      if (r.error) throw new DataRequestError('Load audit log', r.error);
      const last = Math.max(1, Math.ceil(r.count / this.pageSize()));
      if (page > last) {
        await this.load(last);
        return;
      }
      this.rows.set(r.data);
      this.total.set(r.count);
      this.page.set(page);
    } catch (e) {
      if (request === this.request) {
        this.rows.set([]);
        this.total.set(0);
        this.error.set(e instanceof Error ? e.message : 'Audit log could not be loaded.');
      }
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }
}
