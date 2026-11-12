import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Parent } from '../../core/models/academy.model';
import { ParentsService } from '../../core/supabase/domain-services';
import { AsyncState } from '../../shared/async-state/async-state';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { DataTable } from '../../shared/data-table/data-table';
import { TableTools } from '../../shared/data-table/table-tools';
import { ExportColumn, ExportRow } from '../../shared/export/export.models';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { PageHero } from '../../shared/page-hero/page-hero';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-parents-page',
  imports: [TableTools, AsyncState, DataTable, ColumnFilter, PageHero, StatusBadge, SummaryMetricCard, SortableHeader],
  templateUrl: './parents-page.html',
  styleUrl: './parents-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentsPage implements OnInit {
  private requestSequence = 0;
  protected readonly columns = createColumnFilters(() => this.applyDirectoryFilters(), () => { ++this.requestSequence; this.page.set(1); });
  private readonly router = inject(Router);
  private readonly parentsApi = inject(ParentsService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(InteractionDialogService);
  private readonly apiParents = signal<
    readonly (Parent & {
      readonly status: 'active' | 'inactive';
      readonly children: readonly string[];
    })[]
  >([]);
  protected readonly loadingParents = signal(true);
  protected readonly message = signal('');
  protected readonly error = signal('');
  // Load failures keep their inline state; only transient successes toast.
  private readonly toastFeedback = effect(() => {
    const message = this.message();
    if (message) this.toast.success(message);
  });
  protected readonly query = signal('');
  protected readonly relationFilter = signal('all');
  protected readonly statusFilter = signal('all');
  protected readonly sortBy = signal('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly parentTotal = signal(0);
  protected readonly directoryMetrics = signal({
    total: 0,
    active: 0,
    inactive: 0,
    children: 0,
    newThisMonth: 0,
  });

  protected readonly rows = computed(() => this.apiParents());
  protected readonly filteredRows = computed(() => this.rows());
  protected readonly pagedRows = computed(() => this.rows());
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.parentTotal() / this.pageSize())),
  );
  protected readonly metrics = computed(() => this.directoryMetrics());

  ngOnInit(): void {
    void this.loadParents();
  }

  protected edit(parent: Parent): void {
    void this.router.navigate(['/parents', parent.id, 'edit']);
  }
  protected async deleteParent(parent: Parent): Promise<void> {
    const confirmed = await this.dialogs.confirm(
      `Delete parent ${parent.name}? This permanently removes the parent and related records.`,
      'Delete Parent',
      'Delete'
    );
    if (!confirmed) return;
    this.toast.show('Deleting parent...', 'info');
    try {
      await this.parentsApi.deleteParent(parent.id);
      this.toast.show('Parent deleted successfully.', 'success');
      void this.loadParents();
    } catch (error) {
      this.toast.show(
        error instanceof Error ? error.message : 'Could not delete parent.',
        'error'
      );
    }
  }
  protected addParent(): void {
    void this.router.navigateByUrl('/parents/add');
  }
  protected openDetails(id: string): void {
    void this.router.navigate(['/parents', id]);
  }
  protected refresh(): void {
    void this.loadParents().then(() => this.message.set('Parent records refreshed.'));
  }
  protected readonly exportColumns: readonly ExportColumn[] = [
    { key: 'name', label: 'Parent name' },
    { key: 'relation', label: 'Relation' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'children', label: 'Children' },
    { key: 'status', label: 'Status' },
    { key: 'joinedOn', label: 'Joined on' },
  ];
  protected readonly exportReference = 'Parent directory';
  /** Reads the full filtered directory, not just the rendered page. */
  protected readonly exportParents = async (): Promise<readonly ExportRow[]> => {
    const rows = await this.parentsApi.directoryExport({
      columns: this.columns.params(),
      search: this.query(),
      relation: this.relationFilter(),
      status: this.statusFilter(),
    });
    return rows.map((row) => ({
      name: row.full_name,
      relation: row.relation ?? 'Guardian',
      phone: row.phone,
      email: row.email ?? '—',
      children: row.student_parents.flatMap((link) => (link.student ? [link.student.full_name] : [])).length,
      status: row.status,
      joinedOn: row.created_at?.slice(0, 10) || '—',
    }));
  };
  protected changePage(value: number): void {
    this.page.set(Math.min(this.pageCount(), Math.max(1, value)));
    void this.loadParents(false);
  }
  protected changePageSize(value: number): void {
    this.pageSize.set(value);
    this.page.set(1);
    void this.loadParents(false);
  }
  protected applyDirectoryFilters(): void {
    this.page.set(1);
    void this.loadParents(false);
  }
  protected changeSortBy(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (['name', 'relation', 'phone', 'email', 'children', 'status', 'joinedOn'].includes(value)) {
      this.sortBy.set(value);
      this.page.set(1);
      void this.loadParents(false);
    }
  }
  protected sortColumn(value: string): void {
    if (!['name', 'relation', 'phone', 'email', 'children', 'status', 'joinedOn'].includes(value)) return;
    const key = value as 'name' | 'relation' | 'status' | 'joinedOn';
    this.sortDirection.set(this.sortBy() === key ? (this.sortDirection() === 'asc' ? 'desc' : 'asc') : 'asc');
    this.sortBy.set(key);
    this.page.set(1);
    void this.loadParents(false);
  }
  protected changeSortDirection(event: Event): void {
    this.sortDirection.set((event.target as HTMLSelectElement).value === 'desc' ? 'desc' : 'asc');
    this.page.set(1);
    void this.loadParents(false);
  }
  protected resetDirectoryFilters(): void {
    this.query.set('');
    this.relationFilter.set('all');
    this.statusFilter.set('all');
    this.applyDirectoryFilters();
  }
  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  protected emailFor(name: string): string {
    return this.rows().find((parent) => parent.name === name)?.email || '—';
  }
  protected joinedOn(index: number): string {
    return this.rows()[index]?.joinedOn || '—';
  }
  protected openDashboard(): void {
    void this.router.navigateByUrl('/dashboard');
  }

  private async loadParents(loadCounts = true): Promise<void> {
    const request = ++this.requestSequence;
    this.loadingParents.set(true);
    this.error.set('');
    try {
      const [directory, counts] = await Promise.all([
        this.parentsApi.directoryPage(this.page(), this.pageSize(), {
          columns: this.columns.params(),
          search: this.query(),
          relation: this.relationFilter(),
          status: this.statusFilter(),
          sortBy: this.sortBy(),
          sortDirection: this.sortDirection(),
        }),
        loadCounts ? this.parentsApi.directoryCounts() : Promise.resolve(this.directoryMetrics()),
      ]);
      if (request !== this.requestSequence) return;
      this.parentTotal.set(directory.total);
      this.directoryMetrics.set(counts);
      this.apiParents.set(
        await Promise.all(
          directory.rows.map(async (record) => {
            const address = record.address ?? {};
            const links = record.student_parents;
            return {
              id: record.id,
              name: record.full_name,
              relation: record.relation ?? 'Guardian',
              mobile: record.phone,
              whatsapp: record.whatsapp ?? record.phone,
              email: record.email ?? undefined,
              occupation: record.occupation ?? undefined,
              address: address['formatted'] ?? address['address'] ?? undefined,
              city: address['city'] ?? undefined,
              state: address['state'] ?? undefined,
              pinCode: address['pinCode'] ?? address['pin_code'] ?? undefined,
              status: record.status,
              joinedOn: record.created_at,
              photoUrl: record.photo_path
                ? await this.parentsApi.photoUrl(record.photo_path)
                : null,
              children: links.flatMap((link) => (link.student ? [link.student.full_name] : [])),
            } as Parent & {
              readonly status: 'active' | 'inactive';
              readonly children: readonly string[];
            };
          }),
        ),
      );
    } catch (error) {
      if (request !== this.requestSequence) return;
      this.apiParents.set([]);
      this.error.set(
        error instanceof Error ? error.message : 'Parent records could not be loaded.',
      );
    } finally {
      if (request === this.requestSequence) this.loadingParents.set(false);
    }
  }
}
