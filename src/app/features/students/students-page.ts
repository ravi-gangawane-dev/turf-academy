import { TableTools } from '../../shared/data-table/table-tools';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { AsyncState } from '../../shared/async-state/async-state';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { DataTable } from '../../shared/data-table/data-table';
import { PageHero } from '../../shared/page-hero/page-hero';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { StudentListItem, StudentListService, StudentSummary } from './student-list.service';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { ToastService } from '../../shared/toast/toast.service';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';

@Component({
  selector: 'app-students-page',
  imports: [TableTools, AsyncState, DatePipe, PageHero, DataTable, ColumnFilter, StatusBadge, SummaryMetricCard, SortableHeader],
  templateUrl: './students-page.html',
  styleUrl: './students-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsPage implements OnInit {
  private requestSequence = 0;
  protected readonly columns=createColumnFilters(()=>{this.page.set(1);void this.load();},()=>{++this.requestSequence;this.page.set(1);});
  private readonly router = inject(Router);
  private readonly students = inject(StudentListService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogs = inject(InteractionDialogService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  private readonly searchChanges = new Subject<string>();
  protected readonly rows = signal<readonly StudentListItem[]>([]);
  protected readonly filters = signal({
    batches: [] as readonly { id: string; name: string }[],
    programs: [] as readonly { id: string; name: string }[],
    coaches: [] as readonly { id: string; name: string }[],
  });
  protected readonly metrics = signal<StudentSummary>({
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0,
    graduated: 0,
  });
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly message = signal('');
  private readonly toastFeedback = effect(() => { const error = this.error(); const message = this.message(); if (error) this.toast.show(error, 'error'); else if (message) this.toast.show(message, 'success'); });
  protected readonly deletingId = signal('');
  protected readonly searchText = signal('');
  protected readonly batch = signal('');
  protected readonly program = signal('');
  protected readonly coach = signal('');
  protected readonly status = signal('');
  protected readonly sortBy = signal<string>('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly total = signal(0);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  ngOnInit(): void {
    const success = globalThis.history?.state?.['success'];
    if (typeof success === 'string') {
      this.message.set(success);
      globalThis.history.replaceState({}, '');
    }
    this.searchChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        void this.load();
      });
    void Promise.all([this.load(), this.loadMetrics(), this.loadFilters()]);
  }
  protected search(value: string): void {
    this.searchText.set(value.trim());
    this.searchChanges.next(value.trim());
  }
  protected filter(kind: 'batch' | 'program' | 'coach' | 'status', value: string): void {
    ({ batch: this.batch, program: this.program, coach: this.coach, status: this.status })[
      kind
    ].set(value === 'all' ? '' : value);
    this.page.set(1);
    void this.load();
  }
  protected changeSortBy(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (['name', 'code', 'status', 'dateOfBirth', 'joinDate'].includes(value)) {
      this.sortBy.set(value as 'name' | 'code' | 'status' | 'dateOfBirth' | 'joinDate');
      this.page.set(1);
      void this.load();
    }
  }
  protected sortColumn(value: string): void {
    if (!value.startsWith('cf_') && !['name', 'code', 'status', 'dateOfBirth', 'joinDate'].includes(value)) return;
    const key = value as 'name' | 'code' | 'status' | 'dateOfBirth' | 'joinDate';
    this.sortDirection.set(this.sortBy() === key ? (this.sortDirection() === 'asc' ? 'desc' : 'asc') : 'asc');
    this.sortBy.set(key);
    this.page.set(1);
    void this.load();
  }
  protected changeSortDirection(event: Event): void {
    this.sortDirection.set((event.target as HTMLSelectElement).value === 'asc' ? 'asc' : 'desc');
    this.page.set(1);
    void this.load();
  }
  protected resetFilters(): void {
    this.searchText.set(''); this.batch.set(''); this.program.set(''); this.coach.set(''); this.status.set(''); this.page.set(1); void this.load();
  }
  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.pageCount()) {
      this.page.set(page);
      void this.load();
    }
  }
  protected setPageSize(size: string | number): void {
    this.pageSize.set(Number(size));
    this.page.set(1);
    void this.load();
  }
  protected retry(): void {
    void Promise.all([this.load(), this.loadMetrics(), this.loadFilters()]);
  }
  protected openAdd(): void {
    void this.router.navigateByUrl('/students/add');
  }
  protected openStudent(id: string): void {
    const route =
      this.auth.session()?.user?.role === 'parent' ? ['/parent/children', id] : ['/students', id];
    void this.router.navigate(route);
  }
  protected editStudent(id: string): void {
    void this.router.navigate(['/students', id, 'edit']);
  }
  protected openBreadcrumb(label: string): void {
    void this.router.navigateByUrl(label === 'Dashboard' ? '/dashboard' : '/students');
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  protected hideBrokenImage(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
  protected async deleteStudent(row: StudentListItem): Promise<void> {
    if (
      this.deletingId() ||
      !(await this.dialogs.confirm(
        `Delete ${row.fullName}? This permanently removes the student and related records.`,
        'Delete student',
        'Delete',
      ))
    )
      return;
    this.deletingId.set(row.id);
    this.message.set('');
    try {
      await this.students.deleteStudent(row.id);
      if (this.rows().length === 1 && this.page() > 1) this.page.update((value) => value - 1);
      await Promise.all([this.load(), this.loadMetrics()]);
      this.message.set('Student deleted successfully.');
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Student could not be deleted.');
    } finally {
      this.deletingId.set('');
    }
  }
  protected exportStudents(): void {
    const headers = [
      'Student ID',
      'Student',
      'Batch',
      'Coach',
      'Date of birth',
      'Phone',
      'Status',
      'Guardian',
      'Join date',
    ];
    const lines = [
      headers,
      ...this.rows().map((row) => [
        row.studentCode,
        row.fullName,
        row.batchName ?? '',
        row.coachName ?? '',
        row.dateOfBirth,
        row.phone ?? '',
        row.status,
        row.parentName ?? '',
        row.joinDate,
      ]),
    ];
    const csv = lines
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
  private async load(): Promise<void> {
    const request = ++this.requestSequence;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.students.getStudents({columns:this.columns.params(),
        search: this.searchText(),
        batchId: this.batch(),
        programId: this.program(),
        coachId: this.coach(),
        status: this.status(),
        page: this.page(),
        pageSize: this.pageSize(),
        sortBy: this.sortBy(),
        sortDirection: this.sortDirection(),
      });
      if (request !== this.requestSequence) return;
      this.rows.set(result.rows);
      this.total.set(result.total);
    } catch (error) {
      if (request !== this.requestSequence) return;
      this.rows.set([]);
      this.total.set(0);
      this.error.set(error instanceof Error ? error.message : 'Students could not be loaded.');
    } finally {
      if (request === this.requestSequence) this.loading.set(false);
    }
  }
  private async loadMetrics(): Promise<void> {
    try {
      this.metrics.set(await this.students.summary());
    } catch {
      /* list remains usable */
    }
  }
  private async loadFilters(): Promise<void> {
    try {
      this.filters.set(await this.students.filters());
    } catch {
      /* list remains usable */
    }
  }
}
