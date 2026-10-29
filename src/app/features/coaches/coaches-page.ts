import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Coach } from '../../core/models/academy.model';
import { CoachesService } from '../../core/supabase/domain-services';
import { ServerListService } from '../../core/supabase/server-list.service';
import { AsyncState } from '../../shared/async-state/async-state';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { DataTable } from '../../shared/data-table/data-table';
import { TableTools } from '../../shared/data-table/table-tools';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { PageHero } from '../../shared/page-hero/page-hero';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-coaches-page',
  imports: [TableTools, ColumnFilter, AsyncState, StatusBadge, DataTable, PageHero, SummaryMetricCard, SortableHeader],
  templateUrl: './coaches-page.html',
  styleUrl: './coaches-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachesPage implements OnInit {
  private readonly router = inject(Router);
  private readonly lists = inject(ServerListService);
  private requestId = 0;
  protected readonly columns = createColumnFilters(() => this.filterChanged(), () => { ++this.requestId; this.page.set(1); });
  protected readonly total = signal(0);
  private readonly coachesApi = inject(CoachesService);
  private readonly apiCoaches = signal<readonly Coach[]>([]);
  protected readonly loadingCoaches = signal(true);
  protected readonly query = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly sortBy = signal('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly coaches = computed(() => this.apiCoaches());
  protected readonly coachMetrics = signal({ total: 0, active: 0, inactive: 0, specializations: 0, experienced: 0 });
  protected filterChanged(): void { this.page.set(1); void this.loadCoaches(); }
  protected changeSortBy(event: Event): void { this.sortBy.set((event.target as HTMLSelectElement).value); this.filterChanged(); }
  protected sortColumn(key: string): void { this.sortDirection.set(this.sortBy() === key ? (this.sortDirection() === 'asc' ? 'desc' : 'asc') : 'asc'); this.sortBy.set(key); this.filterChanged(); }
  protected changeSortDirection(event: Event): void { this.sortDirection.set((event.target as HTMLSelectElement).value === 'desc' ? 'desc' : 'asc'); this.filterChanged(); }

  ngOnInit(): void {
    void this.loadCoaches();
  }

  private async loadCoaches(): Promise<void> {
    const request = ++this.requestId;
    this.loadingCoaches.set(true);
    this.error.set('');
    try {
      const result = await this.lists.page<Awaited<ReturnType<CoachesService['list']>>[number], ReturnType<typeof this.coachMetrics>>('coaches', this.page(), this.pageSize(), { ...this.columns.params(), search: this.query(), status: this.statusFilter(), sortBy: this.sortBy(), sortDirection: this.sortDirection() });
      if (request !== this.requestId) return;
      const records = result.rows;
      this.total.set(result.total); this.page.set(result.page); this.coachMetrics.set(result.metrics);
      this.apiCoaches.set(
        records.map((record) => {
          const specializations = (record.coach_specializations ?? []).map(
            (row: { specialization: string }) => row.specialization,
          );
          return {
            id: record.id,
            name: record.full_name,
            mobile: record.phone,
            email: record.email ?? undefined,
            dateOfBirth: record.date_of_birth ?? undefined,
            experienceYears: Number(record.experience_years ?? 0),
            qualification: record.qualification ?? undefined,
            biography: record.biography ?? undefined,
            specialization: specializations[0] ?? 'General coaching',
            specializations,
            photoDataUrl: record.photo_url ?? undefined,
            status: record.status,
          } as Coach;
        }),
      );
    } catch (error) {
      if (request !== this.requestId) return;
      this.total.set(0);
      this.apiCoaches.set([]);
      this.error.set(error instanceof Error ? error.message : 'Coach records could not be loaded.');
    } finally {
      if (request === this.requestId) this.loadingCoaches.set(false);
    }
  }
  protected create(): void {
    void this.router.navigateByUrl('/coaches/add');
  }
  protected edit(coach: Coach): void {
    void this.router.navigate(['/coaches', coach.id, 'edit']);
  }
  protected openCoachDetails(coach: Coach): void {
    void this.router.navigate(['/coaches', coach.id]);
  }
  protected coachEmail(coach: Coach): string {
    return coach.email || 'Not provided';
  }
  private readonly dialogs = inject(InteractionDialogService);
  private readonly toast = inject(ToastService);
  protected async deleteCoach(coach: Coach): Promise<void> {
    const confirmed = await this.dialogs.confirm(
      `Delete coach ${coach.name}? This permanently removes the coach and related records.`,
      'Delete Coach',
      'Delete'
    );
    if (!confirmed) return;
    this.toast.show('Deleting coach...', 'info');
    try {
      await this.coachesApi.deleteCoach(coach.id);
      this.toast.show('Coach deleted successfully.', 'success');
      void this.loadCoaches();
    } catch (error) {
      this.toast.show(
        error instanceof Error ? error.message : 'Could not delete coach.',
        'error'
      );
    }
  }
  protected changePage(value: number): void {
    this.page.set(Math.min(this.pageCount(), Math.max(1, value)));
    void this.loadCoaches();
  }
  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.filterChanged();
  }
  protected openDashboard(): void {
    void this.router.navigateByUrl('/dashboard');
  }
  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
