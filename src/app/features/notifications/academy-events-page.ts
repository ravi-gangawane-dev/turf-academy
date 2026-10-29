import { TableTools } from '../../shared/data-table/table-tools';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { AcademyEventRecord, AcademyEventsService } from '../../core/supabase/domain-services';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import { NotificationSectionNav } from '../../shared/notification-section-nav/notification-section-nav';
import { PageHero } from '../../shared/page-hero/page-hero';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { ToastService } from '../../shared/toast/toast.service';
import { Pagination } from '../../shared/pagination/pagination';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';

@Component({
  selector: 'app-academy-events-page',
  imports: [TableTools, ColumnFilter, SortableHeader,
    PageHero,
    DatePipe,
    ModalFocus,
    NotificationSectionNav,
    ReactiveFormsModule,
    FormsModule,
    Pagination,
    StatusBadge,
  ],
  templateUrl: './academy-events-page.html',
  styleUrl: './academy-events-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademyEventsPage implements OnInit {
  private readonly api = inject(AcademyEventsService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly rows = signal<readonly AcademyEventRecord[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected search = '';
  protected eventTypeFilter = '';
  protected statusFilter = '';
  protected sortBy = 'eventDate';
  protected sortDirection: 'asc' | 'desc' = 'desc';
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  /** Status of the record being edited so an archived event is never reactivated by an edit. */
  protected readonly editingStatus = signal<AcademyEventRecord['status']>('active');
  protected readonly form = this.fb.nonNullable.group({
    eventType: ['holiday' as AcademyEventRecord['event_type'], Validators.required],
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    eventDate: [this.today(), Validators.required],
    description: ['', Validators.maxLength(1000)],
  });
  private requestSequence = 0;
  protected readonly columns=createColumnFilters(()=>{this.page.set(1);void this.reload();},()=>{++this.requestSequence;this.page.set(1);});

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected open(row?: AcademyEventRecord): void {
    this.editingId.set(row?.id ?? null);
    this.editingStatus.set(row?.status ?? 'active');
    this.form.reset({
      eventType: row?.event_type ?? 'holiday',
      title: row?.title ?? '',
      eventDate: row?.event_date ?? this.today(),
      description: row?.description ?? '',
    });
    this.dialogOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set('');
    try {
      const value = this.form.getRawValue();
      const editingId = this.editingId();
      await this.api.save({
        ...(editingId ? { id: editingId } : {}),
        event_type: value.eventType,
        title: value.title.trim(),
        event_date: value.eventDate,
        description: value.description.trim(),
        status: this.editingStatus(),
      });
      this.dialogOpen.set(false);
      this.message.set('Event saved. Active events notify parents on the event date.');
      this.toast.show('Event saved.', 'success');
      await this.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Event could not be saved.';
      this.error.set(message);
      this.toast.show(message, 'error');
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggle(row: AcademyEventRecord): Promise<void> {
    const status = row.status === 'active' ? 'inactive' : 'active';
    try {
      await this.api.setStatus(row.id, status);
      this.toast.show(`Event ${status === 'active' ? 'activated' : 'archived'}.`, 'success');
      await this.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Event status could not be changed.';
      this.error.set(message);
      this.toast.show(message, 'error');
    }
  }

  protected async reload(): Promise<void> {
    const request = ++this.requestSequence;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.page(this.page(), this.pageSize(), {columns:this.columns.params(),
        search: this.search,
        eventType: this.eventTypeFilter,
        status: this.statusFilter,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
      });
      if (request !== this.requestSequence) return;
      this.rows.set(result.rows);
      this.total.set(result.total);
    } catch (error) {
      if (request === this.requestSequence) {
        this.error.set(error instanceof Error ? error.message : 'Events could not be loaded.');
      }
    } finally {
      if (request === this.requestSequence) this.loading.set(false);
    }
  }

  protected async applyFilters(): Promise<void> {
    this.page.set(1);
    await this.reload();
  }

  protected async setPage(page: number): Promise<void> {
    this.page.set(page);
    await this.reload();
  }

  protected async setPageSize(size: number): Promise<void> {
    this.pageSize.set(size);
    this.page.set(1);
    await this.reload();
  }

  protected async changeSort(event: Event | string): Promise<void> {
    const value = typeof event==='string'?event:(event.target as HTMLSelectElement).value;
    if (!['title', 'description', 'eventDate', 'eventType', 'status', 'createdAt'].includes(value)) return;
    if (this.sortBy === value) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else {
      this.sortBy = value;
      this.sortDirection = 'asc';
    }
    await this.applyFilters();
  }

  private today(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
