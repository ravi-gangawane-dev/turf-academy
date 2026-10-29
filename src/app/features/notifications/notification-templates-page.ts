import { TableTools } from '../../shared/data-table/table-tools';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { PageHero } from '../../shared/page-hero/page-hero';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationTemplatesService } from '../../core/supabase/domain-services';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { ToastService } from '../../shared/toast/toast.service';
import { NotificationSectionNav } from '../../shared/notification-section-nav/notification-section-nav';
import { DataRequestError } from '../../core/supabase/data-error';
import { StorageService } from '../../core/supabase/storage.service';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../shared/pagination/pagination';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
import {
  SUPPORTED_TEMPLATE_CHANNELS,
  validateNotificationTemplate,
} from './notification-template-contract';

interface TemplateRow {
  readonly id: string;
  readonly name: string;
  readonly templateKey: string;
  readonly channel: 'whatsapp' | 'email' | 'in_app';
  readonly subject: string;
  readonly body: string;
  readonly status: 'active' | 'inactive';
}
@Component({
  selector: 'app-notification-templates-page',
  imports: [TableTools, ColumnFilter,PageHero, ModalFocus, ReactiveFormsModule, FormsModule, StatusBadge, NotificationSectionNav, Pagination, SortableHeader],
  templateUrl: './notification-templates-page.html',
  styleUrl: './notification-templates-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationTemplatesPage implements OnInit, OnDestroy {
  private readonly api = inject(NotificationTemplatesService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly supabase = inject(SupabaseClientService);
  private readonly storage = inject(StorageService);
  protected readonly rows = signal<readonly TemplateRow[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected search = '';
  protected channelFilter = '';
  protected statusFilter = '';
  protected sortBy = 'name';
  protected sortDirection: 'asc' | 'desc' = 'asc';
  protected readonly studentBirthdayPhoto = signal<string | null>(null);
  protected readonly studentBirthdayName = signal('Aarav Sharma');
  protected readonly coachBirthdayPhoto = signal<string | null>(null);
  protected readonly coachBirthdayName = signal('Maya Patel');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly supportedChannels = SUPPORTED_TEMPLATE_CHANNELS.map((value) => ({
    value,
    label: value === 'in_app' ? 'In-app' : value === 'email' ? 'Email' : 'WhatsApp',
  }));
  protected readonly message = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly previewValues: Readonly<Record<string, string>> = {
    parent_name: 'Priya Sharma',
    student_name: 'Aarav Sharma',
    coach_name: 'Maya Patel',
    batch_name: 'U-12 Development',
    amount: 'INR 1,200.00',
    due_date: '13 Oct 2026',
    event_name: 'Academy Annual Day',
    event_date: '13 Oct 2026',
    event_details: 'Celebrations begin at 10:00 AM.',
    session_date: '13 Oct 2026',
    from_date: '10 Oct 2026',
    to_date: '12 Oct 2026',
    event_time: '04:30 PM',
  };
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    templateKey: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
    channel: ['in_app' as TemplateRow['channel'], Validators.required],
    subject: ['', [Validators.maxLength(200)]],
    body: ['', [Validators.required, Validators.maxLength(4000)]],
    status: ['active' as TemplateRow['status'], Validators.required],
  });
  private requestSequence = 0;
  protected readonly columns=createColumnFilters(()=>{this.page.set(1);void this.reload();},()=>{++this.requestSequence;this.pendingQuery='';this.page.set(1);});
  private destroyed = false;
  private previewPhotosLoaded = false;
  private pendingQuery = '';
  private pendingLoad?: Promise<void>;
  private appliedFilters = { search: '', channel: '', status: '' };

  ngOnDestroy(): void {
    this.destroyed = true;
    ++this.requestSequence;
  }
  protected previewText(value: string): string {
    return value.replace(/\{([a-z0-9_]+)\}/g, (placeholder, key: string) => {
      if (key === 'student_name') return this.studentBirthdayName();
      if (key === 'coach_name') return this.coachBirthdayName();
      return this.previewValues[key] ?? placeholder;
    });
  }

  async ngOnInit(): Promise<void> {
    await this.reload();
  }
  protected open(row?: TemplateRow): void {
    if (!this.previewPhotosLoaded) {
      this.previewPhotosLoaded = true;
      void this.loadPreviewPhotos();
    }
    this.formError.set('');
    this.editingId.set(row?.id ?? null);
    this.form.reset({
      name: row?.name ?? '',
      templateKey: row?.templateKey ?? '',
      channel: row?.channel ?? 'in_app',
      subject: row?.subject ?? '',
      body: row?.body ?? '',
      status: row?.status ?? 'active',
    });
    this.dialogOpen.set(true);
  }
  protected async save(): Promise<void> {
    this.formError.set('');
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const issues = validateNotificationTemplate({
      templateKey: v.templateKey.trim(),
      channel: v.channel,
      subject: v.subject.trim(),
      body: v.body.trim(),
    });
    if (issues.length) {
      this.formError.set(issues[0].message);
      this.toast.show(issues[0].message, 'error');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      await this.api.save({
        ...(this.editingId() ? { id: this.editingId() } : {}),
        name: v.name.trim(),
        template_key: v.templateKey.trim(),
        channel: v.channel,
        subject: v.subject.trim() || null,
        body: v.body.trim(),
        status: v.status,
      });
      this.dialogOpen.set(false);
      this.message.set('Notification template saved.');
      this.toast.show('Notification template saved.', 'success');
      this.pendingQuery = '';
      await this.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Template could not be saved.';
      this.error.set(message);
      this.toast.show(message, 'error');
    } finally {
      this.saving.set(false);
    }
  }
  protected async toggle(row: TemplateRow): Promise<void> {
    try {
      await this.api.setStatus(row.id, row.status === 'active' ? 'inactive' : 'active');
      this.toast.show(`Template ${row.status === 'active' ? 'disabled' : 'activated'}.`, 'success');
      this.pendingQuery = '';
      await this.reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Template status could not be changed.';
      this.error.set(message);
      this.toast.show(message, 'error');
    }
  }
  protected async applyFilters(): Promise<void> {
    this.appliedFilters = { search: this.search.trim(), channel: this.channelFilter, status: this.statusFilter };
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
    const value = typeof event === 'string' ? event : (event.target as HTMLSelectElement).value;
    if (!['name', 'templateKey', 'channel', 'body', 'status', 'updatedAt'].includes(value)) return;
    if (this.sortBy === value) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else {
      this.sortBy = value;
      this.sortDirection = 'asc';
    }
    await this.applyFilters();
  }
  protected reload(): Promise<void> {
    const key = JSON.stringify([this.page(), this.pageSize(), this.columns.values(), this.appliedFilters, this.sortBy, this.sortDirection]);
    if (this.pendingLoad && this.pendingQuery === key) return this.pendingLoad;
    this.pendingQuery = key;
    const load = this.loadPage();
    this.pendingLoad = load;
    void load.finally(() => { if (this.pendingLoad === load) this.pendingLoad = undefined; });
    return load;
  }

  private async loadPage(): Promise<void> {
    const request = ++this.requestSequence;
    this.loading.set(true);
    this.rows.set([]);
    this.error.set('');
    try {
      const result = await this.api.page(this.page(), this.pageSize(), {
        ...this.appliedFilters, columns:this.columns.params(),
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
      });
      if (request !== this.requestSequence) return;
      const lastPage = Math.max(1, Math.ceil(result.total / this.pageSize()));
      if (this.page() > lastPage) {
        this.page.set(lastPage);
        await this.reload();
        return;
      }
      this.rows.set(
        result.rows.map((row) => ({
          id: String(row['id']),
          name: String(row['name']),
          templateKey: String(row['template_key']),
          channel: row['channel'] as TemplateRow['channel'],
          subject: String(row['subject'] ?? ''),
          body: String(row['body']),
          status: row['status'] as TemplateRow['status'],
        })),
      );
      this.total.set(result.total);
    } catch (error) {
      if (request === this.requestSequence) {
        this.rows.set([]);
        this.total.set(0);
        this.error.set(error instanceof Error ? error.message : 'Templates could not be loaded.');
      }
    } finally {
      if (request === this.requestSequence) this.loading.set(false);
    }
  }

  private async loadPreviewPhotos(): Promise<void> {
    try {
      await this.loadBirthdayPreviewPhotos();
    } catch {
      // Preview photos are optional; the live preview falls back to the default avatar.
    }
  }

  private async loadBirthdayPreviewPhotos(): Promise<void> {
    const client = this.supabase.requireClient();
    const [studentResult, coachResult] = await Promise.all([
      client
        .from('students')
        .select('full_name,photo_path,photo_url')
        .eq('full_name', 'Aarav Sharma')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle(),
      client
        .from('coaches')
        .select('full_name,photo_path,photo_url')
        .eq('status', 'active')
        .not('photo_path', 'is', null)
        .limit(1)
        .maybeSingle(),
    ]);
    if (studentResult.error) throw new DataRequestError('Load student birthday preview photo', studentResult.error);
    if (coachResult.error) throw new DataRequestError('Load coach birthday preview photo', coachResult.error);

    const [studentPhoto, coachPhoto] = await Promise.all([
      studentResult.data?.photo_path
        ? this.storage.signedUrl('student-photos', studentResult.data.photo_path, 3600)
        : Promise.resolve(studentResult.data?.photo_url ?? null),
      coachResult.data?.photo_path
        ? this.storage.signedUrl('coach-photos', coachResult.data.photo_path, 3600)
        : Promise.resolve(coachResult.data?.photo_url ?? null),
    ]);
    if (this.destroyed) return;
    this.studentBirthdayName.set(studentResult.data?.full_name ?? 'Aarav Sharma');
    this.coachBirthdayName.set(coachResult.data?.full_name ?? 'Maya Patel');
    this.studentBirthdayPhoto.set(studentPhoto);
    this.coachBirthdayPhoto.set(coachPhoto);
  }
}
