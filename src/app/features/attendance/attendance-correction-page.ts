import { TableTools } from '../../shared/data-table/table-tools';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { AsyncState } from '../../shared/async-state/async-state';
import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceCorrectionRecord, AttendanceService } from '../../core/supabase/domain-services';
import { ToastService } from '../../shared/toast/toast.service';
import { Pagination } from '../../shared/pagination/pagination';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';

type CorrectionStatus = 'pending' | 'approved' | 'rejected' | 'all';
interface CorrectionRelationView {
  readonly id?: string;
  readonly attendance_date?: string;
  readonly status?: string;
  readonly full_name?: string;
  readonly student_code?: string;
  readonly name?: string;
  readonly student?: CorrectionRelationView | null;
  readonly batch?: CorrectionRelationView | null;
}

@Component({
  selector: 'app-attendance-correction-page',
  imports: [TableTools, AsyncState, ColumnFilter, FormsModule, Pagination, SortableHeader],
  templateUrl: './attendance-correction-page.html',
  styleUrl: './attendance-correction-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceCorrectionPage implements OnInit {
  private readonly attendance = inject(AttendanceService);
  private readonly toast = inject(ToastService);
  protected readonly rows = signal<readonly AttendanceCorrectionRecord[]>([]);
  protected readonly status = signal<CorrectionStatus>('pending');
  protected readonly search = signal('');
  protected readonly sortBy = signal<string>('createdAt');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly submittingId = signal('');
  protected readonly message = signal('');
  protected readonly error = signal('');
  private readonly toastFeedback = effect(() => {
    const error = this.error();
    const message = this.message();
    if (error) this.toast.show(error, 'error');
    else if (message) this.toast.show(message, 'success');
  });
  protected reviewReason = '';
  private requestSequence = 0;
  protected readonly columns = createColumnFilters(()=>{this.page.set(1);void this.load();},()=>{++this.requestSequence;this.page.set(1);});

  async ngOnInit(): Promise<void> {
    await this.load();
  }
  protected async setStatus(event: Event): Promise<void> {
    this.status.set((event.target as HTMLSelectElement).value as CorrectionStatus);
    this.page.set(1);
    await this.load();
  }
  protected async resetFilters(): Promise<void> {
    this.status.set('pending');
    this.search.set('');
    this.page.set(1);
    await this.load();
  }
  protected async setSearch(value: string): Promise<void> {
    this.search.set(value);
    this.page.set(1);
    await this.load();
  }
  protected async changeSortBy(event: Event): Promise<void> {
    const value = (event.target as HTMLSelectElement).value;
    if (!['createdAt','attendanceDate','student','status','batch','current','requested','reason','resolution_status','attendance_date'].includes(value)) return;
    this.sortBy.set(value as 'createdAt' | 'attendanceDate' | 'student' | 'status');
    this.page.set(1);
    await this.load();
  }
  protected async sortColumn(value: string): Promise<void> {
    if (!['createdAt','attendanceDate','student','status','batch','current','requested','reason','resolution_status','attendance_date'].includes(value)) return;
    const key = value as 'createdAt' | 'attendanceDate' | 'student' | 'status';
    this.sortDirection.set(this.sortBy() === key ? (this.sortDirection() === 'asc' ? 'desc' : 'asc') : 'asc');
    this.sortBy.set(key);
    this.page.set(1);
    await this.load();
  }
  protected async changeSortDirection(event: Event): Promise<void> {
    this.sortDirection.set((event.target as HTMLSelectElement).value === 'asc' ? 'asc' : 'desc');
    this.page.set(1);
    await this.load();
  }
  protected async changePage(page: number): Promise<void> {
    this.page.set(page);
    await this.load();
  }
  protected async setPageSize(size: number): Promise<void> {
    this.pageSize.set(size);
    this.page.set(1);
    await this.load();
  }
  protected async resolve(id: unknown, approve: boolean): Promise<void> {
    if (!approve && this.reviewReason.trim().length < 3) {
      this.error.set('Enter a rejection reason with at least 3 characters.');
      return;
    }
    const correctionId = String(id);
    this.submittingId.set(correctionId);
    this.error.set('');
    try {
      await this.attendance.resolveCorrection(correctionId, approve, this.reviewReason);
      this.reviewReason = '';
      this.message.set(`Correction ${approve ? 'approved' : 'rejected'} successfully.`);
      await this.load();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Correction could not be resolved.');
    } finally {
      this.submittingId.set('');
    }
  }
  protected relation(
    row: AttendanceCorrectionRecord | CorrectionRelationView,
    key: 'attendance' | 'student' | 'batch',
  ): CorrectionRelationView {
    const value =
      key === 'attendance' && 'attendance' in row
        ? row.attendance
        : key === 'student' && 'student' in row
          ? row.student
          : key === 'batch' && 'batch' in row
            ? row.batch
            : null;
    return (value ?? {}) as CorrectionRelationView;
  }
  protected requestedStatus(row: AttendanceCorrectionRecord): string {
    return row.corrected_values.status ?? 'Unknown';
  }
  private async load(): Promise<void> {
    const request = ++this.requestSequence;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.attendance.correctionPage(this.page(), this.pageSize(), {columns:this.columns.params(),
        status: this.status(),
        search: this.search(),
        sortBy: this.sortBy(),
        sortDirection: this.sortDirection(),
      });
      if (request !== this.requestSequence) return;
      this.rows.set(result.rows);
      this.total.set(result.total);
      this.page.set(result.page);
    } catch (error) {
      if (request === this.requestSequence) {
        this.error.set(error instanceof Error ? error.message : 'Corrections could not be loaded.');
      }
    } finally {
      if (request === this.requestSequence) this.loading.set(false);
    }
  }
}
