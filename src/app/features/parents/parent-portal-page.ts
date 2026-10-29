import { TableTools } from '../../shared/data-table/table-tools';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { PageHero } from '../../shared/page-hero/page-hero';
import { AcademySupport } from '../../shared/academy-support';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
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
import { RealtimeChannel } from '@supabase/supabase-js';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationsService } from '../../core/supabase/domain-services';
import { StudentFormRecord } from '../students/student-list.service';
import { ParentPortalData, ParentPortalService } from './parent-portal.service';
import { ParentPortalRecord } from './parent-portal.models';
import { summarizeChargeBalances } from './parent-fee-summary';
import { Pagination } from '../../shared/pagination/pagination';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { AsyncState } from '../../shared/async-state/async-state';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';

type ParentView =
  | 'children'
  | 'attendance'
  | 'calendar'
  | 'schedule'
  | 'coach'
  | 'fees'
  | 'payments'
  | 'receipt'
  | 'notifications'
  | 'profile'
  | 'support';

@Component({
  selector: 'app-parent-portal-page',
  imports: [TableTools, PageHero, AcademySupport,DatePipe, AcademyMoneyPipe, Pagination, StatusBadge, AsyncState, SummaryMetricCard, SortableHeader],
  templateUrl: './parent-portal-page.html',
  styleUrl: './parent-portal-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentPortalPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly portal = inject(ParentPortalService);
  private readonly notifications = inject(NotificationsService);
  private channels: readonly RealtimeChannel[] = [];
  private reloadTimer?: ReturnType<typeof setTimeout>;
  protected readonly data = signal<ParentPortalData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly month = signal(new Date());
  protected readonly attendancePage = signal(1);
  protected readonly attendancePageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly attendanceStatus = signal('');
  protected readonly attendanceFrom = signal('');
  protected readonly attendanceTo = signal('');
  protected readonly attendanceSearch = signal('');
  protected readonly attendanceSortBy = signal<'date' | 'checkIn' | 'status'>('date');
  protected readonly attendanceSortDirection = signal<'asc' | 'desc'>('desc');
  protected readonly paymentPage = signal(1);
  protected readonly paymentPageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly paymentStatus = signal('');
  protected readonly paymentSearch = signal('');
  protected readonly paymentSortBy = signal<'date' | 'amount' | 'mode' | 'reference' | 'status'>('date');
  protected readonly paymentSortDirection = signal<'asc' | 'desc'>('desc');
  protected readonly notificationPage = signal(1);
  protected readonly notificationPageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly notificationUnreadOnly = signal(false);
  protected readonly notificationType = signal('');
  protected readonly view = String(this.route.snapshot.data['view'] ?? 'children') as ParentView;
  private requestSequence = 0;
  protected readonly attendance = computed(() => {
    const rows = this.data()?.selected?.workspace.attendance ?? [];
    const present = rows.filter((r) =>
      ['present', 'checked_out'].includes(this.text(r, 'status')),
    ).length;
    const late = rows.filter((r) => this.text(r, 'status') === 'late').length;
    const absent = rows.filter((r) => this.text(r, 'status') === 'absent').length;
    return {
      total: rows.length,
      present,
      late,
      absent,
      rate: rows.length ? Math.round(((present + late) / rows.length) * 100) : 0,
    };
  });
  protected readonly fees = computed(() => {
    return summarizeChargeBalances(this.data()?.charges ?? []);
  });
  protected readonly profileCompletion = computed(() => {
    const vm = this.data();
    if (!vm) return { percentage: 0, completed: 0, total: 9, missing: [] as string[], stage: 1 };
    const parent = vm.parent;
    const address = parent.address;
    const checks = [
      ['Profile photo', Boolean(parent['photo_url'] || parent['photo_path'])],
      ['Full name', Boolean(String(parent['full_name'] ?? '').trim())],
      ['Relationship', Boolean(String(parent['relation'] ?? '').trim())],
      ['Phone number', Boolean(String(parent['phone'] ?? '').trim())],
      ['WhatsApp number', Boolean(String(parent['whatsapp'] ?? '').trim())],
      ['Email address', Boolean(String(parent['email'] ?? '').trim())],
      ['Occupation', Boolean(String(parent['occupation'] ?? '').trim())],
      [
        'Address',
        Boolean(address && Object.values(address).some((value) => String(value ?? '').trim())),
      ],
      ['Linked child', vm.children.length > 0],
    ] as const;
    const completed = checks.filter(([, complete]) => complete).length;
    const percentage = Math.round((completed / checks.length) * 100);
    return {
      percentage,
      completed,
      total: checks.length,
      missing: checks.filter(([, complete]) => !complete).map(([label]) => label),
      stage: percentage === 100 ? 4 : percentage >= 67 ? 3 : percentage >= 34 ? 2 : 1,
    };
  });
  protected readonly calendarDays = computed(() => {
    const current = this.month(),
      year = current.getFullYear(),
      month = current.getMonth(),
      first = new Date(year, month, 1),
      count = new Date(year, month + 1, 0).getDate(),
      prefix = first.getDay();
    const records = new Map(
      (this.data()?.selected?.workspace.attendance ?? []).map((r) => [
        this.text(r, 'attendance_date'),
        this.text(r, 'status'),
      ]),
    );
    const trainingDays = new Set(
      (this.data()?.batchDays ?? []).map((row) => Number(row['day_of_week'])),
    );
    const sessions = new Map(
      (this.data()?.sessions ?? []).map((row) => [
        String(row['session_date']),
        String(row['status']),
      ]),
    );
    return [
      ...Array(prefix).fill(null),
      ...Array.from({ length: count }, (_, i) => {
        const date = new Date(year, month, i + 1),
          key = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        const scheduled = trainingDays.has(date.getDay());
        const sessionStatus = sessions.get(key);
        return {
          day: i + 1,
          date,
          key,
          status:
            records.get(key) ??
            (sessionStatus === 'cancelled' ? 'holiday' : scheduled ? 'no-record' : 'no-session'),
        };
      }),
    ];
  });
  protected readonly schedule = computed(() => {
    return (this.data()?.sessions ?? []).map((row) => ({
      id: String(row['id']),
      date: new Date(String(row['session_date'])),
      name: String(row['title']),
      start: String(row['start_time']),
      end: String(row['end_time']),
      venue: String(row['venue']),
      status: String(row['status']),
      coach: this.related(row, 'coach', 'full_name') || 'To be assigned',
    }));
  });
  async ngOnInit() {
    await this.load();
  }
  ngOnDestroy(): void {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    void this.portal.unsubscribe(this.channels);
  }
  protected async load(showLoading = true) {
    const request = ++this.requestSequence;
    if (showLoading) this.loading.set(true);
    this.error.set('');
    try {
      const data = await this.portal.load({
        attendancePage: this.attendancePage(),
        attendancePageSize: this.attendancePageSize(),
        attendanceStatus: this.attendanceStatus() || undefined,
        attendanceFrom: this.attendanceFrom() || undefined,
        attendanceTo: this.attendanceTo() || undefined,
        attendanceSearch: this.attendanceSearch(),
        attendanceSortBy: this.attendanceSortBy(),
        attendanceSortDirection: this.attendanceSortDirection(),
        paymentPage: this.paymentPage(),
        paymentPageSize: this.paymentPageSize(),
        paymentStatus: this.paymentStatus() || undefined,
        paymentSearch: this.paymentSearch(),
        paymentSortBy: this.paymentSortBy(),
        paymentSortDirection: this.paymentSortDirection(),
        notificationPage: this.notificationPage(),
        notificationPageSize: this.notificationPageSize(),
        notificationUnreadOnly: this.notificationUnreadOnly(),
        notificationType: this.notificationType() || undefined,
      });
      if (request !== this.requestSequence) return;
      this.data.set(data);
      await this.replaceSubscriptions(data);
    } catch (e) {
      if (request === this.requestSequence) this.error.set(e instanceof Error ? e.message : 'Parent portal could not be loaded.');
    } finally {
      if (request === this.requestSequence) this.loading.set(false);
    }
  }
  protected async changeChild(e: Event) {
    this.portal.selectChild((e.target as HTMLSelectElement).value);
    this.resetPages();
    await this.load();
  }
  protected async filterAttendance(event: Event): Promise<void> {
    this.attendanceStatus.set((event.target as HTMLSelectElement).value);
    this.attendancePage.set(1);
    await this.load(false);
  }
  protected async searchAttendance(event: Event): Promise<void> {
    this.attendanceSearch.set((event.target as HTMLInputElement).value);
    this.attendancePage.set(1);
    await this.load(false);
  }
  protected async sortAttendance(value: string): Promise<void> {
    if (!['date', 'checkIn', 'status'].includes(value)) return;
    const key = value as 'date' | 'checkIn' | 'status';
    this.attendanceSortDirection.set(this.attendanceSortBy() === key ? (this.attendanceSortDirection() === 'asc' ? 'desc' : 'asc') : 'asc');
    this.attendanceSortBy.set(key);
    this.attendancePage.set(1);
    await this.load(false);
  }
  protected async filterAttendanceDate(kind: 'from' | 'to', event: Event): Promise<void> {
    const value = (event.target as HTMLInputElement).value;
    (kind === 'from' ? this.attendanceFrom : this.attendanceTo).set(value);
    this.attendancePage.set(1);
    await this.load(false);
  }
  protected async setAttendancePage(page: number): Promise<void> {
    this.attendancePage.set(page);
    await this.load(false);
  }
  protected async setAttendancePageSize(size: number): Promise<void> {
    this.attendancePageSize.set(size);
    this.attendancePage.set(1);
    await this.load(false);
  }
  protected async setPaymentPage(page: number): Promise<void> {
    this.paymentPage.set(page);
    await this.load(false);
  }
  protected async setPaymentPageSize(size: number): Promise<void> {
    this.paymentPageSize.set(size);
    this.paymentPage.set(1);
    await this.load(false);
  }
  protected async filterPayments(event: Event): Promise<void> {
    this.paymentStatus.set((event.target as HTMLSelectElement).value);
    this.paymentPage.set(1);
    await this.load(false);
  }
  protected async searchPayments(event: Event): Promise<void> {
    this.paymentSearch.set((event.target as HTMLInputElement).value);
    this.paymentPage.set(1);
    await this.load(false);
  }
  protected async sortPayments(value: string): Promise<void> {
    if (!['date', 'amount', 'mode', 'reference', 'status'].includes(value)) return;
    const key = value as 'date' | 'amount' | 'mode' | 'reference' | 'status';
    this.paymentSortDirection.set(this.paymentSortBy() === key ? (this.paymentSortDirection() === 'asc' ? 'desc' : 'asc') : 'asc');
    this.paymentSortBy.set(key);
    this.paymentPage.set(1);
    await this.load(false);
  }
  protected async toggleUnread(): Promise<void> {
    this.notificationUnreadOnly.update((value) => !value);
    this.notificationPage.set(1);
    await this.load(false);
  }
  protected async filterNotifications(event: Event): Promise<void> {
    this.notificationType.set((event.target as HTMLSelectElement).value);
    this.notificationPage.set(1);
    await this.load(false);
  }
  protected async setNotificationPage(page: number): Promise<void> {
    this.notificationPage.set(page);
    await this.load(false);
  }
  protected async setNotificationPageSize(size: number): Promise<void> {
    this.notificationPageSize.set(size);
    this.notificationPage.set(1);
    await this.load(false);
  }
  protected async markRead(id: string | undefined): Promise<void> {
    if (!id) return;
    await this.notifications.markRead(id);
    await this.load(false);
  }
  protected async markAllRead(): Promise<void> {
    await this.notifications.markAllRead();
    await this.load(false);
  }
  private async replaceSubscriptions(data: ParentPortalData): Promise<void> {
    await this.portal.unsubscribe(this.channels);
    this.channels = this.portal.subscribe(data, () => {
      if (this.reloadTimer) clearTimeout(this.reloadTimer);
      this.reloadTimer = setTimeout(() => void this.load(false), 150);
    });
  }
  private resetPages(): void {
    this.attendancePage.set(1);
    this.paymentPage.set(1);
    this.notificationPage.set(1);
  }
  protected childProfile(id: string) {
    void this.router.navigate(['/parent/children', id]);
  }
  protected editChild(id: string) {
    void this.router.navigate(['/parent/children', id, 'edit']);
  }
  protected childCompletion(student: StudentFormRecord): number {
    const values = [
      student.fullName,
      student.dateOfBirth,
      student.gender,
      student.bloodGroup,
      student.phone,
      student.email,
      student.address,
      student.city,
      student.state,
      student.pinCode,
      student.nationality,
      student.photoUrl,
    ];
    return Math.round(
      (values.filter((value) => String(value ?? '').trim()).length / values.length) * 100,
    );
  }
  protected viewTitle(): string {
    const titles: Record<ParentView, string> = {
      children: 'My Children',
      attendance: 'Attendance Summary & History',
      calendar: 'Attendance Calendar',
      schedule: 'Training Schedule',
      coach: 'Coach Details',
      fees: 'Fees Overview',
      payments: 'Payment History',
      receipt: 'Receipt Details',
      notifications: 'Notifications',
      profile: 'Parent Profile',
      support: 'Help & Support',
    };
    return titles[this.view];
  }
  protected addressText(value: unknown): string {
    if (!value || typeof value !== 'object') return 'Not provided';
    const address = value as ParentPortalRecord;
    return (
      [address['formatted'], address['city'], address['state'], address['pinCode']]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(', ') || 'Not provided'
    );
  }
  protected go(path: string) {
    void this.router.navigateByUrl(path);
  }
  protected shiftMonth(delta: number) {
    const d = new Date(this.month());
    d.setMonth(d.getMonth() + delta);
    this.month.set(d);
  }
  protected today(): void {
    this.month.set(new Date());
  }
  protected text(row: ParentPortalRecord | null, key: keyof ParentPortalRecord) {
    return String(row?.[key] ?? '');
  }
  protected related(
    row: ParentPortalRecord | null,
    relation: 'batch' | 'coach' | 'monthly_charge' | 'fee_plan',
    key: keyof ParentPortalRecord,
  ) {
    const v = row?.[relation];
    const record = Array.isArray(v) ? v[0] : v;
    return record ? String(record[key] ?? '') : '';
  }
  protected duration(row: ParentPortalRecord) {
    if (!row['check_in_at'] || !row['check_out_at']) return '—';
    const m = Math.round(
      (new Date(String(row['check_out_at'])).getTime() -
        new Date(String(row['check_in_at'])).getTime()) /
        60000,
    );
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }
  protected initials(n: string) {
    return n
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  protected open(url: unknown) {
    if (url) window.open(String(url), '_blank', 'noopener');
  }
  protected printReceipt(): void {
    window.print();
  }
  protected value(row: ParentPortalRecord, key: keyof ParentPortalRecord): unknown {
    return row[key];
  }
  protected money(value: unknown): number {
    return Number(value ?? 0);
  }
  protected receipt(row: ParentPortalRecord, key: 'receipt_number' | 'url'): unknown {
    const receipt = row['receipt'];
    return receipt && typeof receipt === 'object'
      ? Array.isArray(receipt)
        ? receipt[0]?.[key]
        : (receipt as ParentPortalRecord)[key]
      : null;
  }
}
