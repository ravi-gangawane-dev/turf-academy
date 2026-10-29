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
  template: `<section class="app-list-page audit-log-page">
    <app-page-hero
      title="Audit log"
      subtitle="Recorded changes and the account that made each change."
      [breadcrumbs]="[
        { label: 'Dashboard', icon: 'pi-home', route: '/dashboard' },
        { label: 'Academy Settings', icon: 'pi-cog', route: '/settings' },
        { label: 'Audit log' },
      ]"
    />
    <nav class="settings-tabs" aria-label="Settings sections">
      <a routerLink="/settings" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">All Settings</a>
      <a routerLink="/settings/profile" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Profile</a>
      <a routerLink="/settings/operations" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Operations</a>
      <a routerLink="/settings/attendance" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Attendance</a>
      <a routerLink="/settings/notifications" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Notifications</a>
      <a routerLink="/settings/users" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Users &amp; Roles</a>
      <a routerLink="/settings/audit-logs" class="active" aria-current="page">Audit Log</a>
      <a routerLink="/settings/tools" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Tools &amp; Data</a>
    </nav>
    @if (error()) {
      <app-async-state
        kind="error"
        title="Audit log request failed"
        [message]="error()"
        actionLabel="Retry"
        (action)="load(page())"
      />
    }
    @if (loading()) {
      <app-async-state title="Loading audit log…" />
    }
    <section class="app-card audit-results" aria-label="Audit events">
      <div class="table-wrap">
        <app-table-tools title="Audit log" [table]="exportTable1" [total]="total()"></app-table-tools>
<table #exportTable1 class="academy-table">
          <thead>
            <tr>
              <th
                scope="col"
                [attr.aria-sort]="
                  sortBy === 'occurred_at'
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
              >
                <app-sortable-header
                  sortKey="occurred_at"
                  [activeSort]="sortBy"
                  [direction]="sortDirection"
                  (sortChange)="sortColumn('occurred_at')"
                  >Date</app-sortable-header
                >
              </th>
              <th
                scope="col"
                [attr.aria-sort]="
                  sortBy === 'action'
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
              >
                <app-sortable-header
                  sortKey="action"
                  [activeSort]="sortBy"
                  [direction]="sortDirection"
                  (sortChange)="sortColumn('action')"
                  >Action</app-sortable-header
                >
              </th>
              <th
                scope="col"
                [attr.aria-sort]="
                  sortBy === 'table_name'
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
              >
                <app-sortable-header
                  sortKey="table_name"
                  [activeSort]="sortBy"
                  [direction]="sortDirection"
                  (sortChange)="sortColumn('table_name')"
                  >Table</app-sortable-header
                >
              </th>
              <th
                scope="col"
                [attr.aria-sort]="
                  sortBy === 'record_id'
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
              >
                <app-sortable-header
                  sortKey="record_id"
                  [activeSort]="sortBy"
                  [direction]="sortDirection"
                  (sortChange)="sortColumn('record_id')"
                  >Record</app-sortable-header
                >
              </th>
              <th
                scope="col"
                [attr.aria-sort]="
                  sortBy === 'actor_id'
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                "
              >
                <app-sortable-header
                  sortKey="actor_id"
                  [activeSort]="sortBy"
                  [direction]="sortDirection"
                  (sortChange)="sortColumn('actor_id')"
                  >Account</app-sortable-header
                >
              </th>
            </tr>
            <tr class="column-filters">
              <th>
                <label
                  ><input
                    type="date"
                    aria-label="Filter by date"
                    placeholder="Filter date"
                    [(ngModel)]="filters.date"
                    (ngModelChange)="scheduleFilters()" /><i
                    class="pi pi-filter"
                    aria-hidden="true"
                  ></i
                ></label>
              </th>
              <th>
                <label
                  ><input
                    type="search"
                    aria-label="Filter by action"
                    placeholder="Filter action"
                    [(ngModel)]="filters.action"
                    (ngModelChange)="scheduleFilters()" /><i
                    class="pi pi-filter"
                    aria-hidden="true"
                  ></i
                ></label>
              </th>
              <th>
                <label
                  ><input
                    type="search"
                    aria-label="Filter by table"
                    placeholder="Filter table"
                    [(ngModel)]="filters.table"
                    (ngModelChange)="scheduleFilters()" /><i
                    class="pi pi-filter"
                    aria-hidden="true"
                  ></i
                ></label>
              </th>
              <th>
                <label
                  ><input
                    type="search"
                    aria-label="Filter by record"
                    placeholder="Filter record"
                    [(ngModel)]="filters.record"
                    (ngModelChange)="scheduleFilters()" /><i
                    class="pi pi-filter"
                    aria-hidden="true"
                  ></i
                ></label>
              </th>
              <th>
                <label
                  ><input
                    type="search"
                    aria-label="Filter by account"
                    placeholder="Filter account"
                    [(ngModel)]="filters.account"
                    (ngModelChange)="scheduleFilters()" /><i
                    class="pi pi-filter"
                    aria-hidden="true"
                  ></i
                ></label>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.id) {
              <tr>
                <td>{{ row.occurred_at | date: 'medium' }}</td>
                <td>{{ row.action }}</td>
                <td>{{ row.table_name }}</td>
                <td>{{ row.record_id }}</td>
                <td>{{ row.actor_id || 'System' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">
                  @if (!loading() && !error()) {
                    <app-async-state kind="empty" title="No matching audit events." />
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination
        [total]="total()"
        [page]="page()"
        [pageSize]="pageSize()"
        itemLabel="events"
        (pageChange)="load($event)"
        (pageSizeChange)="setPageSize($event)"
      />
    </section>
  </section>`,
  styles: [
    `
      .audit-log-page {
        width: 100%;
        max-width: 1200px;
        margin-inline: auto;
        padding: 0;
        background: transparent;
      }
      .settings-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 6px;
        border: 1px solid var(--app-border);
        border-radius: var(--app-radius-md);
        background: var(--app-card);
      }
      .settings-tabs a {
        display: inline-flex;
        flex: 1 1 120px;
        min-width: 0;
        min-height: 42px;
        align-items: center;
        justify-content: center;
        padding: 10px 18px;
        border-radius: var(--app-radius-sm);
        color: var(--app-muted);
        font: inherit;
        font-weight: 600;
        text-align: center;
        text-decoration: none;
        white-space: nowrap;
        transition: background-color 120ms ease, color 120ms ease;
      }
      .settings-tabs a:hover {
        background: var(--app-primary-soft);
        color: var(--app-primary-dark);
      }
      .settings-tabs a.active {
        color: #fff;
        background: var(--app-primary);
      }
      .settings-tabs a:focus-visible {
        outline: 2px solid var(--app-primary);
        outline-offset: 2px;
      }
      .audit-results {
        min-width: 0;
        overflow: hidden;
        border: 1px solid var(--app-border);
        border-radius: var(--app-radius-md);
        background: var(--app-card);
      }
      .audit-results app-pagination {
        margin-top: 0;
      }
      .table-wrap {
        width: 100%;
        overflow-x: auto;
      }
      table {
        width: 100%;
        min-width: 900px;
        table-layout: fixed;
        border-collapse: collapse;
      }
      td,
      th {
        padding: 14px 16px;
        text-align: left;
        border-bottom: 1px solid var(--app-border);
        vertical-align: middle;
      }
      th {
        background: var(--app-surface-muted);
        color: var(--app-muted);
        font-weight: 700;
      }
      th:nth-child(1),
      td:nth-child(1) {
        width: 190px;
      }
      th:nth-child(2),
      td:nth-child(2) {
        width: 150px;
      }
      th:nth-child(3),
      td:nth-child(3) {
        width: 180px;
      }
      th:nth-child(4),
      td:nth-child(4),
      th:nth-child(5),
      td:nth-child(5) {
        overflow-wrap: anywhere;
      }
      tbody tr {
        background: var(--app-card);
        transition: background-color 120ms ease;
      }
      tbody tr:hover {
        background: var(--app-surface-muted);
      }
      tbody tr:last-child td {
        border-bottom: 0;
      }
      footer {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .audit-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 10px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--app-border);
      }
      .audit-actions button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 40px;
        padding: 8px 14px;
        border: 1px solid var(--app-border);
        border-radius: 8px;
        background: #fff;
        color: var(--app-text);
        font: inherit;
        cursor: pointer;
      }
      .audit-actions button:disabled {
        opacity: 0.55;
        cursor: default;
      }
      .column-filters th {
        padding-top: 8px;
        padding-bottom: 12px;
      }
      .column-filters label {
        position: relative;
        display: block;
      }
      .column-filters input {
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        min-height: 40px;
        padding: 8px 34px 8px 10px;
        border: 1px solid var(--app-border);
        border-radius: 8px;
        background: #fff;
        color: var(--app-text);
        font: inherit;
        font-size: 12px;
      }
      .column-filters i {
        position: absolute;
        top: 50%;
        right: 11px;
        color: var(--app-muted);
        transform: translateY(-50%);
        pointer-events: none;
      }
      .column-filters input:focus-visible,
      .audit-actions button:focus-visible {
        outline: 2px solid var(--app-primary);
        outline-offset: 2px;
      }
      @media (max-width: 700px) {
        .table-wrap {
          overflow-x: auto;
        }
      }
    `,
  ],
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
