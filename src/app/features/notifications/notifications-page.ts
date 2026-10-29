import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationEntityFilter } from './notification-entity-filter';
import { AuthService } from '../../core/auth/auth.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { NotificationScope, NotificationsService } from '../../core/supabase/domain-services';
import { AsyncState } from '../../shared/async-state/async-state';
import { ColumnFilter, createColumnFilters } from '../../shared/column-filter/column-filter';
import { TableTools } from '../../shared/data-table/table-tools';
import { DialogService } from '../../shared/dialog/dialog.service';
import { DialogType } from '../../shared/dialog/models/dialog-config.model';
import { NotificationSectionNav } from '../../shared/notification-section-nav/notification-section-nav';
import { PageHero } from '../../shared/page-hero/page-hero';
import { Pagination } from '../../shared/pagination/pagination';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import {
  NotificationQuery,
  notificationQueryParams,
  readNotificationQuery,
} from './notification-query';

type DeliveryStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed';

interface AdminNotification {
  readonly manualSupported: boolean;
  readonly manualState: string;
  readonly providerId: string;
  readonly uncertain: boolean;
  readonly claimed: boolean;
  readonly id: string;
  readonly subject: string;
  readonly body: string;
  readonly recipient: string;
  readonly studentName: string;
  readonly channel: 'sms' | 'whatsapp' | 'email' | 'in_app';
  readonly status: DeliveryStatus;
  readonly templateKey: string;
  readonly createdAt: string;
  readonly sentAt: string;
  readonly readAt: string;
  readonly scheduledAt: string;
  readonly retryCount: number;
  readonly failureReason: string;
}

@Component({
  selector: 'app-notifications-page',
  imports: [
    TableTools,
    ColumnFilter,
    SortableHeader,
    PageHero,
    AsyncState,
    StatusBadge,
    DatePipe,
    Pagination,
    SummaryMetricCard,
    NotificationSectionNav,
    NotificationEntityFilter,
  ],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage implements OnInit, OnDestroy {
  private destroyed = false;
  private readonly whatsapp = inject(WhatsappService);
  protected canOpenManual(row: AdminNotification): boolean {
    return (
      row.manualSupported &&
      row.channel === 'whatsapp' &&
      !row.providerId &&
      !row.claimed &&
      !row.uncertain &&
      (!row.manualState || row.manualState === 'launch_requested') &&
      ['queued', 'failed'].includes(row.status) &&
      (!row.scheduledAt || Date.parse(row.scheduledAt) <= Date.now())
    );
  }
  protected async manualAction(
    row: AdminNotification,
    action: 'request' | 'confirm' | 'cancel',
  ): Promise<void> {
    if (this.delivering()) return;
    this.delivering.set(row.id);
    this.deliveryMessage.set('');
    try {
      if (action === 'request') this.whatsapp.normalizeRecipient(row.recipient);
      const message =
        action === 'request'
          ? `${row.recipient}\n\n${row.body}\n\nThis saves an opening request. You will open WhatsApp on the next screen and press Send there. Delivery stays unknown.${row.manualState ? '\nReopening may duplicate a message you already sent.' : ''}`
          : action === 'confirm'
            ? 'Confirm that you personally pressed Send in WhatsApp. This records your confirmation, not provider-verified delivery.'
            : 'Cancel this manual activity? This cannot undo a message already sent in WhatsApp.';
      if (
        !(await this.dialogs.confirm({
          title: 'Manual WhatsApp',
          message,
          confirmLabel:
            action === 'request'
              ? 'Prepare WhatsApp'
              : action === 'confirm'
                ? 'I sent this message'
                : 'Cancel activity',
        }))
      )
        return;
      const saved = await this.notifications.manualWhatsApp(row.id, action);
      await this.reload();
      if (action === 'request') {
        const link = `https://wa.me/${this.whatsapp.normalizeRecipient(saved.recipient)}?text=${encodeURIComponent(saved.body)}`;
        await this.dialogs.open({
          type: DialogType.WHATSAPP,
          title: 'Open prepared WhatsApp message',
          message: `${saved.recipient}\n\n${saved.body}\n\nOpening request saved. Delivery remains unknown. After sending in WhatsApp, return and choose “Confirm sent”.`,
          confirmLabel: 'Open WhatsApp',
          cancelLabel: 'Close',
          actions: [
            {
              name: 'confirm',
              label: 'Open WhatsApp',
              action: () => {
                window.open(link, '_blank', 'noopener,noreferrer');
                this.deliveryMessage.set(
                  'WhatsApp opening requested. Delivery is unknown; confirm only after pressing Send in WhatsApp.',
                );
              },
            },
          ],
        });
      } else {
        this.deliveryMessage.set(
          action === 'confirm'
            ? 'Staff confirmation saved. Delivery remains unknown.'
            : 'Manual activity cancelled. This does not recall any message already sent.',
        );
      }
    } catch (error) {
      this.deliveryMessage.set(
        error instanceof Error ? error.message : 'Manual activity could not be saved.',
      );
    } finally {
      this.delivering.set('');
    }
  }
  protected readonly historyLoading = signal('');
  protected async copyNotification(row: AdminNotification): Promise<void> {
    try {
      await navigator.clipboard.writeText(row.body);
      this.deliveryMessage.set('Message copied.');
    } catch {
      this.deliveryMessage.set('Copy failed. Open View details to select and copy the message.');
    }
  }
  protected async viewHistory(row: AdminNotification): Promise<void> {
    if (this.destroyed || this.historyLoading()) return;
    this.historyLoading.set(row.id);
    try {
      const events = await this.notifications.history(row.id);
      if (this.destroyed) return;
      const entries = events.map((event) => {
        const evidence = event.evidence;
        const before = evidence?.['before'];
        const after = evidence?.['after'] ?? {};
        return `${event['occurred_at']} — ${String(event['event_type']).replaceAll('_', ' ')}\nActor: ${event['actor_id'] || 'System / identity not recorded'}\nStatus: ${before?.status ? before.status + ' → ' : ''}${after.status ?? 'Not recorded'}\nAttempt count: ${after.retry_count ?? 'Not recorded'}\nProvider ID: ${after.provider_message_id || 'Not recorded'}\nSent: ${after.sent_at || 'Not recorded'}\nRead: ${after.read_at || 'Not recorded'}${after.manual_state ? '\nManual activity: ' + after.manual_state + '\nManual recorded: ' + after.manual_updated_at + '\nManual delivery: unknown' : ''}${after.delivery_uncertain ? '\nOutcome uncertain; reconciliation required.' : ''}${after.failure_reason ? '\nFailure: ' + after.failure_reason : ''}`;
      });
      void this.dialogs.info(
        `Newest ${events.length} recorded events (maximum 100). History begins when event recording is enabled; earlier attempts are not reconstructed.\n\n${entries.join('\n\n') || 'No recorded events for this notification.'}`,
        `History: ${row.subject}`,
      );
    } catch (error) {
      if (this.destroyed) return;
      this.deliveryMessage.set(
        error instanceof Error ? error.message : 'Notification history could not be loaded.',
      );
    } finally {
      if (!this.destroyed) this.historyLoading.set('');
    }
  }
  protected readonly delivering = signal('');
  protected readonly providerChannels = signal<string[]>(['in_app']);
  protected readonly deliveryMessage = signal('');
  protected async delivery(row: AdminNotification): Promise<void> {
    if (this.delivering()) return;
    if (!row.providerId && !this.canSend(row)) return;
    this.delivering.set(row.id);
    this.deliveryMessage.set('');
    try {
      if (
        !row.providerId &&
        row.status === 'failed' &&
        !(await this.dialogs.confirm({
          title: 'Retry failed notification?',
          message: `Retry this message to ${row.recipient}?\n\n${row.body}`,
          confirmLabel: 'Retry message',
        }))
      )
        return;
      const result = await this.notifications.deliveryAction(
        row.providerId ? 'status' : 'send',
        row.id,
      );
      this.deliveryMessage.set(
        result.status === 'sent'
          ? 'Provider accepted the message. Refresh its status to check delivery.'
          : 'Delivery status updated.',
      );
      await this.reload();
    } catch (e) {
      this.deliveryMessage.set(e instanceof Error ? e.message : 'Delivery failed.');
      await this.reload();
    } finally {
      this.delivering.set('');
    }
  }
  protected canSend(row: AdminNotification): boolean {
    return (
      row.channel !== 'in_app' &&
      !row.providerId &&
      !row.manualState &&
      !row.claimed &&
      !row.uncertain &&
      ['queued', 'failed'].includes(row.status) &&
      this.providerChannels().includes(row.channel) &&
      (!row.scheduledAt || Date.parse(row.scheduledAt) <= Date.now())
    );
  }
  private async loadDeliveryConfiguration(): Promise<void> {
    try {
      const result = await this.notifications.deliveryAction('configuration');
      this.providerChannels.set(result.channels ?? ['in_app']);
    } catch {
      this.deliveryMessage.set(
        'External delivery is unavailable until the provider is configured.',
      );
    }
  }
  private readonly notifications = inject(NotificationsService);
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(DialogService);
  private querySubscription?: Subscription;
  private initialized = false;
  protected readonly channel = signal('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly pageTitle = 'Notifications Management';
  protected get availableChannelsLabel(): string {
    return this.providerChannels()
      .map((channel) => {
        if (channel === 'sms') return 'SMS';
        if (channel === 'whatsapp') return 'WhatsApp';
        return channel.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
      })
      .join(', ');
  }
  protected readonly records = signal<readonly AdminNotification[]>([]);
  protected readonly filter = signal<'all' | DeliveryStatus>('all');
  protected readonly categoryFilter = signal('all');
  protected readonly showMoreFilters = signal(false);
  protected readonly advancedFilterCount = computed(() => [this.from(), this.to(), this.studentId(), this.recipientId(), this.batchId(), this.studentName(), this.columns.values()['recipient']].filter(Boolean).length);
  protected readonly search = signal('');
  protected readonly studentName = signal('');
  protected readonly studentId = signal('');
  protected readonly recipientId = signal('');
  protected readonly batchId = signal('');
  protected setEntity(field: 'studentId' | 'recipientId' | 'batchId', value: string): void {
    this[field].set(value);
    this.page.set(1);
    void this.reload();
  }
  protected readonly sortBy = signal<
    'createdAt' | 'subject' | 'recipient' | 'status' | 'channel' | 'templateKey'
  >('createdAt');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly total = signal(0);
  protected readonly error = signal('');
  protected readonly rows = this.records.asReadonly();
  protected readonly counts = signal({ all: 0, delivered: 0, pending: 0, failed: 0 });
  private requestSequence = 0;
  protected readonly columns = createColumnFilters(
    () => {
      this.page.set(1);
      void this.reload();
    },
    () => {
      ++this.requestSequence;
      this.pendingQuery = '';
      this.page.set(1);
    },
  );
  protected sortColumn(key: string): void {
    if (!['createdAt', 'subject', 'recipient', 'status', 'channel', 'templateKey'].includes(key))
      return;
    this.sortDirection.set(
      this.sortBy() === key && this.sortDirection() === 'asc' ? 'desc' : 'asc',
    );
    this.sortBy.set(key as ReturnType<typeof this.sortBy>);
    this.page.set(1);
    void this.reload();
  }
  private searchTimer?: ReturnType<typeof setTimeout>;
  protected readonly entityFilterReset = signal(0);
  private pendingQuery = '';
  private pendingLoad?: Promise<void>;

  ngOnDestroy(): void {
    this.destroyed = true;
    this.querySubscription?.unsubscribe();
    clearTimeout(this.searchTimer);
    ++this.requestSequence;
  }

  async ngOnInit(): Promise<void> {
    void this.loadDeliveryConfiguration();
    this.querySubscription = this.route.queryParamMap.subscribe((params) => {
      const query = readNotificationQuery(params);
      if (
        this.initialized &&
        JSON.stringify(notificationQueryParams(query)) ===
          JSON.stringify(notificationQueryParams(this.currentQuery()))
      )
        return;
      this.initialized = true;
      clearTimeout(this.searchTimer);
      ++this.requestSequence;
      this.pendingQuery = '';
      this.channel.set(query.channel);
      this.filter.set(query.status);
      this.categoryFilter.set(query.type);
      this.search.set(query.search);
      this.studentName.set(query.studentName);
      this.studentId.set(query.studentId);
      this.recipientId.set(query.recipientId);
      this.batchId.set(query.batchId);
      this.from.set(query.from);
      this.to.set(query.to);
      this.page.set(query.page);
      this.pageSize.set(query.pageSize);
      this.sortBy.set(query.sort);
      this.sortDirection.set(query.direction);
      this.columns.params(); // Cancel a pending column debounce before restoring URL state.
      this.columns.values.set(query.columns);
      void this.reload(false);
    });
    await this.pendingLoad;
  }

  private currentQuery(): NotificationQuery {
    return {
      channel: this.channel(),
      status: this.filter(),
      type: this.categoryFilter(),
      search: this.search(),
      studentName: this.studentName(),
      studentId: this.studentId(),
      recipientId: this.recipientId(),
      batchId: this.batchId(),
      from: this.from(),
      to: this.to(),
      page: this.page(),
      pageSize: this.pageSize(),
      sort: this.sortBy(),
      direction: this.sortDirection(),
      columns: this.columns.values(),
    };
  }

  protected setChannel(value: string): void {
    this.channel.set(value);
    this.page.set(1);
    void this.reload();
  }
  protected setDate(bound: 'from' | 'to', value: string): void {
    this[bound].set(value);
    this.page.set(1);
    void this.reload();
  }
  protected viewNotification(row: AdminNotification): void {
    void this.dialogs.info(
      `Notification: ${row.id}\nRecipient: ${row.recipient}\nStudent: ${row.studentName || 'Not linked'}\nChannel: ${row.channel}\nStatus: ${row.status}\nCreated: ${row.createdAt}\nScheduled: ${row.scheduledAt || 'Not recorded'}\nSent / published: ${row.sentAt || 'Not recorded'}\nInbox read: ${row.readAt || 'Not recorded'}\nManual activity: ${row.manualState || 'None'}${row.manualState ? ' (delivery unknown)' : ''}\nAttempts: ${row.retryCount}\nProvider ID: ${row.providerId || 'Not recorded'}\n\n${row.body}${row.failureReason ? '\n\nFailure: ' + row.failureReason : ''}${row.uncertain ? '\n\nOutcome uncertain. Reconciliation required before retrying.' : ''}`,
      row.subject,
    );
  }
  protected setFilter(value: string): void {
    this.filter.set(value as 'all' | DeliveryStatus);
    this.page.set(1);
    void this.reload();
  }
  protected setCategoryFilter(value: string): void {
    this.categoryFilter.set(
      value as 'all' | 'birthday' | 'attendance_check_in' | 'attendance_check_out',
    );
    this.page.set(1);
    void this.reload();
  }
  protected clearFilters(): void {
    this.entityFilterReset.update((value) => value + 1);
    this.channel.set('');
    this.from.set('');
    this.to.set('');
    this.columns.params();
    this.columns.values.set({});
    this.filter.set('all');
    this.categoryFilter.set('all');
    this.search.set('');
    this.studentName.set('');
    this.studentId.set('');
    this.recipientId.set('');
    this.batchId.set('');
    this.page.set(1);
    void this.reload();
  }
  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.changePage(1);
  }
  protected changePage(value: number): void {
    this.page.set(value);
    void this.reload();
  }
  protected setSearch(value: string, field: 'search' | 'studentName' = 'search'): void {
    if (value === this[field]()) return;
    this[field].set(value);
    this.page.set(1);
    clearTimeout(this.searchTimer);
    ++this.requestSequence;
    this.pendingQuery = '';
    this.loading.set(true);
    this.error.set('');
    this.searchTimer = setTimeout(() => void this.reload(), 250);
  }
  protected setSortBy(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (['createdAt', 'subject', 'status', 'channel', 'templateKey'].includes(value)) {
      this.sortBy.set(
        value as 'createdAt' | 'subject' | 'recipient' | 'status' | 'channel' | 'templateKey',
      );
      this.page.set(1);
      void this.reload();
    }
  }
  protected setSortDirection(event: Event): void {
    this.sortDirection.set((event.target as HTMLSelectElement).value === 'asc' ? 'asc' : 'desc');
    this.page.set(1);
    void this.reload();
  }

  protected reload(writeUrl = true): Promise<void> {
    clearTimeout(this.searchTimer);
    if (this.from() && this.to() && this.from() > this.to()) {
      ++this.requestSequence;
      this.pendingQuery = '';
      this.loading.set(false);
      this.error.set('From date must be on or before To date.');
      this.records.set([]);
      this.total.set(0);
      this.counts.set({ all: 0, delivered: 0, pending: 0, failed: 0 });
      return Promise.resolve();
    }
    if (writeUrl && this.initialized) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: notificationQueryParams(this.currentQuery()),
      });
    }
    const key = JSON.stringify([
      this.columns.values(),
      this.page(),
      this.pageSize(),
      this.filter(),
      this.channel(),
      this.from(),
      this.to(),
      this.categoryFilter(),
      this.search().trim(),
      this.studentName().trim(),
      this.studentId(),
      this.recipientId(),
      this.batchId(),
      this.sortBy(),
      this.sortDirection(),
    ]);
    if (this.pendingLoad && this.pendingQuery === key) return this.pendingLoad;
    this.pendingQuery = key;
    const load = this.loadPage();
    this.pendingLoad = load;
    void load.finally(() => {
      if (this.pendingLoad === load) this.pendingLoad = undefined;
    });
    return load;
  }

  private async loadPage(): Promise<void> {
    const request = ++this.requestSequence;
    this.loading.set(true);
    this.error.set('');
    try {
      const status = this.filter() === 'all' ? undefined : this.filter();
      const templateCategory = this.categoryFilter() === 'all' ? undefined : this.categoryFilter();
      const scope: Omit<NotificationScope, 'channel'> = {
        status,
        templateCategory,
        from: this.from() || undefined,
        to: this.to() || undefined,
        studentName: this.studentName() || undefined,
        ...(this.studentId() ? { studentId: this.studentId() } : {}),
        ...(this.recipientId() ? { recipientId: this.recipientId() } : {}),
        ...(this.batchId() ? { batchId: this.batchId() } : {}),
        columns: this.columns.params(),
        search: this.search(),
      };
      const [result, counts] = await Promise.all([
        this.notifications.page(
          this.page(),
          this.pageSize(),
          status,
          this.channel() || undefined,
          undefined,
          templateCategory,
          {
            from: scope.from,
            to: scope.to,
            studentName: scope.studentName,
            ...(scope.studentId ? { studentId: scope.studentId } : {}),
            ...(scope.recipientId ? { recipientId: scope.recipientId } : {}),
            ...(scope.batchId ? { batchId: scope.batchId } : {}),
            columns: scope.columns,
            search: scope.search,
            sortBy: this.sortBy(),
            sortDirection: this.sortDirection(),
          },
        ),
        this.notifications.counts(this.channel() || undefined, scope),
      ]);
      if (request !== this.requestSequence) return;
      const lastPage = Math.max(1, Math.ceil(result.total / this.pageSize()));
      if (this.page() > lastPage) {
        this.page.set(lastPage);
        await this.reload();
        return;
      }
      const rows = result.rows;
      this.total.set(result.total);
      this.counts.set(counts);
      this.records.set(
        rows.map((row) => ({
          id: String(row['id']),
          manualState: String(row['manual_state'] ?? ''),
          manualSupported: 'manual_state' in row,
          subject: String(row['subject'] ?? row['template_key'] ?? 'Notification'),
          body: String(row['body'] ?? ''),
          recipient: String(row['recipient'] ?? ''),
          studentName: String(row.student?.full_name ?? ''),
          channel: row['channel'] as AdminNotification['channel'],
          status: row['status'] as DeliveryStatus,
          templateKey: String(row['template_key'] ?? ''),
          createdAt: String(row['created_at'] ?? row['scheduled_at']),
          sentAt: String(row['sent_at'] ?? ''),
          readAt: String(row['read_at'] ?? ''),
          scheduledAt: String(row['scheduled_at'] ?? ''),
          retryCount: Number(row['retry_count'] ?? 0),
          failureReason: String(row['failure_reason'] ?? ''),
          providerId: String(row['provider_message_id'] ?? ''),
          uncertain: !!row['delivery_uncertain'],
          claimed: !!row['delivery_claimed_at'],
        })),
      );
    } catch (error) {
      if (request === this.requestSequence) {
        this.records.set([]);
        this.total.set(0);
        this.counts.set({ all: 0, delivered: 0, pending: 0, failed: 0 });
        this.error.set(
          error instanceof Error ? error.message : 'Notifications could not be loaded.',
        );
      }
    } finally {
      if (request === this.requestSequence) this.loading.set(false);
    }
  }
}
