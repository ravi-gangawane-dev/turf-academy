import { formatDate } from '@angular/common';
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
import { utcDateOnly } from '../../core/localisation/academy-locale';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { AcademyDatePipe } from '../../shared/academy-date.pipe';
import { AsyncState } from '../../shared/async-state/async-state';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { DataTable } from '../../shared/data-table/data-table';
import { TableTools } from '../../shared/data-table/table-tools';
import { ExportColumn, ExportRow } from '../../shared/export/export.models';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { ListQueryState } from '../../shared/list-query';
import { PageHero } from '../../shared/page-hero/page-hero';
import { idCardNumber } from '../../shared/print/id-card-qr';
import { PrintIdCardInput } from '../../shared/print/print-document.models';
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { printDateOnly } from '../../shared/print/print-format';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { ToastService } from '../../shared/toast/toast.service';
import { StudentListItem, StudentListService, StudentSummary } from './student-list.service';

@Component({
  selector: 'app-students-page',
  imports: [TableTools, AsyncState, AcademyDatePipe, PageHero, DataTable, ColumnFilter, StatusBadge, SummaryMetricCard, SortableHeader],
  templateUrl: './students-page.html',
  styleUrl: './students-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsPage implements OnInit {
  private requestSequence = 0;
  protected readonly columns = createColumnFilters(() => { this.page.set(1); void this.load(); }, () => { ++this.requestSequence; this.page.set(1); });
  private readonly router = inject(Router);
  private readonly preferences = inject(AcademyPreferencesService);
  private readonly students = inject(StudentListService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogs = inject(InteractionDialogService);
  private readonly toast = inject(ToastService);
  private readonly printDocuments = inject(PrintDocumentService);
  protected readonly auth = inject(AuthService);
  private readonly searchChanges = new Subject<string>();
  protected readonly rows = signal<readonly StudentListItem[]>([]);
  /** Student ids ticked for batch ID-card printing on the current page. */
  protected readonly selection = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedCount = computed(
    () => this.rows().filter((row) => this.selection().has(row.id)).length,
  );
  protected readonly allOnPageSelected = computed(
    () => this.rows().length > 0 && this.rows().every((row) => this.selection().has(row.id)),
  );
  protected readonly printingCards = signal(false);
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
  // Only transient successes are announced here; load failures stay inline in the table.
  private readonly toastFeedback = effect(() => { const message = this.message(); if (message) this.toast.success(message); });
  protected readonly deletingId = signal('');
  protected readonly searchText = signal('');
  protected readonly batch = signal('');
  protected readonly program = signal('');
  protected readonly coach = signal('');
  protected readonly status = signal('');
  protected readonly total = signal(0);
  protected readonly listQuery = new ListQueryState<string>({ sortBy: 'name', total: this.total });
  protected readonly sortBy = this.listQuery.sortBy;
  protected readonly sortDirection = this.listQuery.sortDirection;
  protected readonly page = this.listQuery.page;
  protected readonly pageSize = this.listQuery.pageSize;
  protected readonly pageCount = this.listQuery.pageCount;

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
    this.listQuery.sortByColumn(key);
    void this.load();
  }
  protected changeSortDirection(event: Event): void {
    this.listQuery.setSortDirection((event.target as HTMLSelectElement).value === 'asc' ? 'asc' : 'desc');
    void this.load();
  }
  protected resetFilters(): void {
    this.searchText.set(''); this.batch.set(''); this.program.set(''); this.coach.set(''); this.status.set(''); this.page.set(1); void this.load();
  }
  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.pageCount()) {
      this.listQuery.setPage(page);
      void this.load();
    }
  }
  protected setPageSize(size: string | number): void {
    this.listQuery.setPageSize(Number(size));
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
  /**
   * A signed photo URL can expire or the object can be missing. Clearing the URL
   * drops the avatar back to initials instead of leaving an empty circle.
   */
  protected hideBrokenImage(
    row: StudentListItem,
    field: 'photoUrl' | 'coachPhotoUrl',
    event: Event,
  ): void {
    (event.target as HTMLImageElement).style.display = 'none';
    this.rows.update((rows) =>
      rows.map((item) => (item.id === row.id ? { ...item, [field]: undefined } : item)),
    );
  }
  protected toggleSelected(id: string): void {
    const next = new Set(this.selection());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selection.set(next);
  }
  protected isSelected(id: string): boolean {
    return this.selection().has(id);
  }
  protected togglePageSelection(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selection.set(checked ? new Set(this.rows().map((row) => row.id)) : new Set());
  }
  /** Preview every ticked student's ID card as one duplex-ready print job. */
  protected async printSelectedCards(): Promise<void> {
    if (this.printingCards()) return;
    const cards = this.rows()
      .filter((row) => this.selection().has(row.id))
      .map((row) => this.idCard(row));
    if (!cards.length) {
      this.toast.info('Tick at least one student to print ID cards.');
      return;
    }
    this.printingCards.set(true);
    try {
      await this.printDocuments.printIdCards(cards, 'preview');
    } catch (error) {
      this.toast.error(
        error instanceof Error ? error.message : 'The ID cards could not be prepared.',
      );
    } finally {
      this.printingCards.set(false);
    }
  }
  /** Card data comes from the live list row; nothing is invented for missing fields. */
  private idCard(row: StudentListItem): PrintIdCardInput {
    return {
      issuedAt: new Date().toISOString(),
      cardNumber: idCardNumber('student', row.studentCode || row.id),
      holderType: 'student',
      holderId: row.id,
      fullName: row.fullName,
      holderCode: row.studentCode || row.id,
      subtitle: row.batchName || 'No active batch',
      photoUrl: row.photoUrl,
      details: [
        { label: 'Date of birth', value: printDateOnly(row.dateOfBirth) },
        { label: 'Guardian', value: row.parentName || '—' },
        { label: 'Guardian phone', value: row.parentPhone || '—' },
        { label: 'Batch', value: row.batchName || 'Not assigned' },
        { label: 'Joined', value: printDateOnly(row.joinDate) },
      ],
      validityNote: 'Valid while actively enrolled',
    };
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
      this.toast.success('Student deleted successfully.');
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Student could not be deleted.');
    } finally {
      this.deletingId.set('');
    }
  }
  protected readonly exportColumns: readonly ExportColumn[] = [
    { key: 'student', label: 'Student' },
    { key: 'batch', label: 'Batch / Program' },
    { key: 'coach', label: 'Coach' },
    { key: 'dateOfBirth', label: 'Date of birth' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' },
    { key: 'guardian', label: 'Parent / Guardian' },
    { key: 'joinDate', label: 'Join date' },
  ];
  protected readonly exportReference = 'Student directory';
  /** Reads every filtered student in pages so the export is not limited to the screen. */
  protected readonly exportStudents = async (): Promise<readonly ExportRow[]> => {
    const pageSize = 500;
    const rows: ExportRow[] = [];
    for (let page = 1; ; page++) {
      const result = await this.students.getStudents({
        columns: this.columns.params(),
        search: this.searchText(),
        batchId: this.batch(),
        programId: this.program(),
        coachId: this.coach(),
        status: this.status(),
        page,
        pageSize,
        sortBy: this.sortBy(),
        sortDirection: this.sortDirection(),
      });
      rows.push(...result.rows.map((row) => this.exportRow(row)));
      if (!result.rows.length || rows.length >= result.total) return rows;
    }
  };
  private exportRow(row: StudentListItem): ExportRow {
    return {
      student: `${row.fullName} (${row.studentCode})`,
      batch: row.batchName || 'Not assigned',
      coach: row.coachName || 'Not assigned',
      dateOfBirth: formatDate(utcDateOnly(row.dateOfBirth), 'dd MMM yyyy', this.preferences.locale(), 'UTC'),
      phone: row.phone || '—',
      status: row.status,
      guardian: row.parentName || 'Not linked',
      joinDate: formatDate(utcDateOnly(row.joinDate), 'dd MMM yyyy', this.preferences.locale(), 'UTC'),
    };
  }
  private async load(): Promise<void> {
    const request = ++this.requestSequence;
    this.selection.set(new Set());
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.students.getStudents({
        columns: this.columns.params(),
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
