import { TableTools } from '../../shared/data-table/table-tools';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { AcademySupport } from '../../shared/academy-support';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Pagination } from '../../shared/pagination/pagination';
import { AsyncState } from '../../shared/async-state/async-state';
import { SummaryCard, SummaryCards } from '../../shared/summary-cards/summary-cards';
import { PageHero, PageHeroBreadcrumb } from '../../shared/page-hero/page-hero';
import { CalendarLayout } from '../../shared/calendar-layout/calendar-layout';
import { UiCard } from '../../shared/ui-card/ui-card';
import { CoachAttendanceRecord, CoachPortalData, CoachPortalService, CoachRow, CoachSession, CoachStudent } from './coach-portal.service';
import { AttendanceOutboxService } from '../../core/offline/attendance-outbox.service';
import { API_CONFIG } from '../../core/config/api.config';
import { LatestQueryGuard } from './latest-query.guard';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { FilterBar } from '../../shared/filter-bar/filter-bar';
import { ToastService } from '../../shared/toast/toast.service';

type CoachView =
  | 'dashboard'
  | 'batches'
  | 'batch'
  | 'students'
  | 'student'
  | 'attendance'
  | 'check-in-out'
  | 'history'
  | 'correction'
  | 'summary'
  | 'schedule'
  | 'notifications'
  | 'profile'
  | 'support';

@Component({
  selector: 'app-coach-portal-page',
  imports: [TableTools, AcademySupport,
    AsyncState,
    CalendarLayout,
    DatePipe,
    FilterBar,
    NgTemplateOutlet,
    PageHero,
    Pagination,
    SummaryCards,
    StatusBadge,
    UiCard,
  ],
  templateUrl: './coach-portal-page.html',
  styleUrl: './coach-portal-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachPortalPage implements OnInit, OnDestroy {
  protected readonly academyPreferences = inject(AcademyPreferencesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly portal = inject(CoachPortalService);
  private readonly dialogs = inject(InteractionDialogService);
  private readonly toast = inject(ToastService);
  protected readonly attendanceOutbox = inject(AttendanceOutboxService);
  protected readonly appConfig = inject(API_CONFIG);
  protected readonly data = signal<CoachPortalData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly actionMessage = signal('');
  private readonly toastFeedback = effect(() => {
    const error = this.error();
    const message = this.actionMessage();
    if (error) this.toast.show(error, 'error');
    else if (message) {
      const kind = /failed|unable|could not/i.test(message)
        ? 'error'
        : /select|enter|required/i.test(message)
          ? 'warning'
          : 'success';
      this.toast.show(message, kind);
    }
  });
  // The shared offline outbox replays in the background; refresh the coach
  // panels once a sync round finishes so queued actions become visible.
  private readonly outboxSynced = effect(() => {
    if (this.attendanceOutbox.lastSyncAt() && this.data()) void this.load();
  });
  protected readonly submitting = signal(false);
  protected readonly search = signal('');
  protected readonly batchSearch = signal('');
  protected readonly batchStatus = signal('all');
  protected readonly batchFilter = signal('');
  protected readonly statusFilter = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly studentsLoading = signal(false);
  protected readonly studentsError = signal('');
  protected readonly studentRows = signal<readonly CoachStudent[] | null>(null);
  protected readonly studentTotal = signal(0);
  protected readonly attendanceLoading = signal(false);
  protected readonly attendanceError = signal('');
  protected readonly attendanceRows = signal<readonly CoachAttendanceRecord[] | null>(null);
  protected readonly attendanceTotal = signal(0);
  protected readonly batchesLoading = signal(false);
  protected readonly batchesError = signal('');
  protected readonly sessionsLoading = signal(false);
  protected readonly sessionsError = signal('');
  protected readonly notificationsLoading = signal(false);
  protected readonly notificationsError = signal('');
  protected readonly selectedStudentId = signal('');
  protected readonly selectedBatchId = signal('');
  protected readonly attendanceMode = signal<'check-in' | 'check-out'>('check-in');
  protected readonly qrToken = signal('');
  protected readonly cameraActive = signal(false);
  protected readonly scheduleWeekOffset = signal(0);
  protected readonly scheduleType = signal('');
  protected readonly scheduleMode = signal<'week' | 'day' | 'month'>('week');
  protected readonly correctionAttendanceId = signal('');
  protected readonly correctionReason = signal('');
  protected readonly correctionStatus = signal('present');
  protected readonly profileEditing = signal(false);
  protected readonly profileTab = signal<'personal' | 'coaching' | 'preferences' | 'security'>('personal');
  protected readonly profilePhone = signal('');
  protected readonly profilePhoto = signal<File | null>(null);
  protected readonly notificationFilter = signal<'all' | 'unread' | 'read'>('all');
  protected readonly notificationPage = signal(1);
  private channels: readonly RealtimeChannel[] = [];
  private scanner?: import('html5-qrcode').Html5Qrcode;
  private reloadTimer?: ReturnType<typeof setTimeout>;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private readonly studentQueryGuard = new LatestQueryGuard();
  private readonly attendanceQueryGuard = new LatestQueryGuard();
  protected readonly view = computed(
    () => (this.route.snapshot.data['view'] ?? 'dashboard') as CoachView,
  );
  protected readonly title = computed(
    () =>
      ({
        dashboard: 'Coach Dashboard',
        batches: 'My Batches',
        batch: 'Batch Details',
        students: 'My Students',
        student: 'Student Profile',
        attendance: "Today's Attendance",
        'check-in-out': 'Check In / Check Out',
        history: 'Attendance History',
        correction: 'Attendance Correction',
        summary: 'Attendance Summary',
        schedule: 'My Schedule',
        notifications: 'Notifications',
        profile: 'Coach Profile',
        support: 'Help & Support',
      })[this.view()],
  );
  protected readonly heroBreadcrumbs = computed<readonly PageHeroBreadcrumb[]>(() => [
    { label: 'Dashboard', icon: 'pi-home' },
    ...(this.view() === 'dashboard' ? [] : [{ label: this.title() }]),
  ]);
  protected readonly heroSubtitle = computed(() =>
    this.view() === 'dashboard'
      ? 'Great coaches build great players.'
      : 'Your coaching workspace and academy activity.',
  );
  protected readonly filteredStudents = computed(() => {
    if (this.studentRows()) return this.studentRows()!;
    const query = this.search().trim().toLowerCase();
    return (this.data()?.students ?? []).filter(
      (s) =>
        (!this.batchFilter() || s.batch_id === this.batchFilter()) &&
        (!this.statusFilter() || s.status === this.statusFilter()) &&
        (!query ||
          `${s.full_name} ${s.student_code} ${s.phone ?? ''}`.toLowerCase().includes(query)),
    );
  });
  protected readonly filteredBatches = computed(() => {
    const query = this.batchSearch().trim().toLowerCase();
    const status = this.batchStatus();
    return (this.data()?.batches ?? []).filter(
      (batch) =>
        (!query ||
          `${batch.name} ${batch.code} ${batch.age_group ?? ''}`.toLowerCase().includes(query)) &&
        (status === 'all' || batch.status === status),
    );
  });
  protected readonly selectedStudent = computed(
    () =>
      this.data()?.students.find(
        (s) => s.id === (this.route.snapshot.paramMap.get('studentId') || this.selectedStudentId()),
      ) ?? null,
  );
  protected readonly selectedBatch = computed(
    () =>
      this.data()?.batches.find(
        (b) => b.id === (this.route.snapshot.paramMap.get('batchId') || this.selectedBatchId()),
      ) ?? null,
  );
  protected readonly pagedStudents = computed(() => this.studentRows() ?? []);
  protected readonly filteredAttendance = computed(() =>
    (this.data()?.attendance ?? []).filter(
      (row) =>
        (!this.batchFilter() || row['batch_id'] === this.batchFilter()) &&
        (!this.statusFilter() || row['status'] === this.statusFilter()) &&
        (!this.selectedStudentId() || row['student_id'] === this.selectedStudentId()),
    ),
  );
  protected readonly correctionRecords = computed(() => this.data()?.attendance ?? []);
  protected readonly pagedAttendance = computed(() => this.attendanceRows() ?? []);
  protected readonly notificationTotal = signal(0);
  private notificationRequest=0;
  protected readonly pagedNotifications = computed(() => this.data()?.notifications ?? []);
  protected readonly todayAttendance = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (this.data()?.attendance ?? []).filter((r) => r['attendance_date'] === today);
  });
  protected readonly todaySessions = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (this.data()?.sessions ?? []).filter((session) => session['session_date'] === today);
  });
  protected readonly todayBatchAttendance = computed(() => {
    const rows = this.todayAttendance().filter(
      (row) => !this.selectedBatchId() || row['batch_id'] === this.selectedBatchId(),
    );
    const present = rows.filter((row) =>
      ['present', 'checked_out'].includes(String(row['status'])),
    ).length;
    const absent = rows.filter((row) => row['status'] === 'absent').length;
    const late = rows.filter((row) => row['status'] === 'late').length;
    return {
      total: rows.length,
      present,
      absent,
      late,
      rate: rows.length ? Math.round(((present + late) / rows.length) * 100) : 0,
    };
  });
  protected readonly attendanceSummary = computed(() => {
    const rows = this.data()?.attendance ?? [];
    const present = rows.filter((r) =>
      ['present', 'checked_out'].includes(String(r['status'])),
    ).length;
    const late = rows.filter((r) => r['status'] === 'late').length;
    const absent = rows.filter((r) => r['status'] === 'absent').length;
    return {
      total: rows.length,
      present,
      late,
      absent,
      rate: rows.length ? Math.round(((present + late) / rows.length) * 100) : 0,
    };
  });
  protected readonly summaryAttendanceRows = computed(() =>
    (this.data()?.attendance ?? []).filter(
      (row) => !this.selectedBatchId() || row['batch_id'] === this.selectedBatchId(),
    ),
  );
  protected readonly summaryStats = computed(() => {
    const rows = this.summaryAttendanceRows();
    const present = rows.filter((row) =>
      ['present', 'checked_out'].includes(String(row['status'])),
    ).length;
    const absent = rows.filter((row) => row['status'] === 'absent').length;
    const late = rows.filter((row) => row['status'] === 'late').length;
    const sessionDates = new Set(rows.map((row) => String(row['attendance_date'])));
    return {
      total: rows.length,
      present,
      absent,
      late,
      sessions: sessionDates.size,
      rate: rows.length ? Math.round(((present + late) / rows.length) * 100) : 0,
    };
  });
  protected readonly summaryCards = computed<readonly SummaryCard[]>(() => {
    const stats = this.summaryStats();
    const students = this.summaryStudents();
    return [
      {
        label: 'Total students',
        value: students.length,
        hint: 'Assigned to selected batch',
        icon: 'pi-users',
      },
      {
        label: 'Average attendance',
        value: `${stats.rate}%`,
        hint: 'Across recorded sessions',
        icon: 'pi-chart-pie',
        tone: 'purple',
      },
      {
        label: 'Total sessions',
        value: stats.sessions,
        hint: 'Attendance sessions recorded',
        icon: 'pi-calendar',
        tone: 'blue',
      },
      {
        label: 'Present students',
        value: stats.present,
        hint: `Absent: ${stats.absent} · Late: ${stats.late}`,
        icon: 'pi-user-plus',
        tone: 'orange',
      },
    ];
  });
  protected readonly summarySessions = computed(() => {
    const groups = new Map<string, readonly CoachAttendanceRecord[]>();
    for (const row of this.summaryAttendanceRows()) {
      const date = String(row['attendance_date']);
      groups.set(date, [...(groups.get(date) ?? []), row]);
    }
    return [...groups.entries()].slice(0, 5).map(([date, rows]) => {
      const attended = rows.filter((row) => row['status'] !== 'absent').length;
      const session = (this.data()?.sessions ?? []).find(
        (item) => item['session_date'] === date && item['batch_id'] === this.selectedBatchId(),
      );
      return {
        date,
        title: String(session?.['title'] ?? 'Training session'),
        rate: rows.length ? Math.round((attended / rows.length) * 100) : 0,
      };
    });
  });
  protected readonly dashboardCards = computed<readonly SummaryCard[]>(() => [
    {
      label: 'My batches',
      value: this.data()?.batches.length ?? 0,
      hint: 'Assigned to you',
      icon: 'pi-users',
      route: '/coach/batches',
    },
    {
      label: 'My students',
      value: this.data()?.students.length ?? 0,
      hint: 'Across all batches',
      icon: 'pi-user-plus',
      route: '/coach/students',
      tone: 'blue',
    },
    {
      label: "Today's sessions",
      value: this.todaySessions().length,
      hint: this.todaySessions().length ? 'Scheduled today' : 'No session today',
      icon: 'pi-calendar',
      route: '/coach/schedule',
      tone: 'orange',
    },
    {
      label: 'Attendance',
      value: `${this.attendanceSummary().rate}%`,
      hint: 'Assigned students',
      icon: 'pi-chart-pie',
      route: '/coach/attendance/summary',
      tone: 'purple',
    },
  ]);
  protected readonly batchCards = computed<readonly SummaryCard[]>(() => [
    {
      label: 'Total batches',
      value: this.data()?.batches.length ?? 0,
      hint: 'Assigned to you',
      icon: 'pi-users',
    },
    {
      label: 'Total students',
      value: this.data()?.students.length ?? 0,
      hint: 'Across all batches',
      icon: 'pi-user-plus',
      tone: 'blue',
    },
    {
      label: 'Sessions',
      value: this.data()?.sessions.length ?? 0,
      hint: 'Assigned schedule',
      icon: 'pi-calendar',
      tone: 'orange',
    },
    {
      label: 'Overall attendance',
      value: `${this.attendanceSummary().rate}%`,
      hint: 'All assigned batches',
      icon: 'pi-chart-pie',
      tone: 'purple',
    },
  ]);
  protected readonly studentCards = computed<readonly SummaryCard[]>(() => {
    const students = this.data()?.students ?? [];
    const active = students.filter((student) => student.status === 'active').length;
    const average = students.length
      ? Math.round(
          students.reduce((total, student) => total + this.attendanceFor(student.id), 0) /
            students.length,
        )
      : 0;
    return [
      {
        label: 'Total students',
        value: students.length,
        hint: 'Assigned to your batches',
        icon: 'pi-users',
        tone: 'blue',
      },
      {
        label: 'Active',
        value: active,
        hint: `${students.length ? Math.round((active / students.length) * 100) : 0}% of students`,
        icon: 'pi-check-circle',
      },
      {
        label: 'Inactive',
        value: students.length - active,
        hint: 'Currently inactive',
        icon: 'pi-user-minus',
        tone: 'orange',
      },
      {
        label: 'Average attendance',
        value: `${average}%`,
        hint: 'Across assigned students',
        icon: 'pi-chart-pie',
        tone: 'purple',
      },
    ];
  });
  protected readonly scheduleDays = computed(() => {
    const now = new Date();
    const mode = this.scheduleMode();
    if (mode === 'day') {
      now.setDate(now.getDate() + this.scheduleWeekOffset());
      now.setHours(0, 0, 0, 0);
      return [now];
    }
    if (mode === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth() + this.scheduleWeekOffset(), 1);
      const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      return Array.from(
        { length: count },
        (_, index) => new Date(first.getFullYear(), first.getMonth(), index + 1),
      );
    }
    const monday = new Date(now);
    const day = monday.getDay();
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1) + this.scheduleWeekOffset() * 7);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  });
  protected readonly scheduleRange = computed(() => {
    const days = this.scheduleDays();
    const format = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return days.length === 1 ? format.format(days[0]) : `${format.format(days[0])} – ${format.format(days[days.length - 1])}`;
  });

  async ngOnInit(): Promise<void> {
    if ((this.view() === 'students' || this.view() === 'attendance'))
      this.search.set(this.route.snapshot.queryParamMap.get('q') ?? '');
    await this.load();
  }
  ngOnDestroy(): void {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    void this.stopQrCamera();
    void this.portal.unsubscribe(this.channels);
  }
  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const value = await this.portal.load();
      this.data.set(value);
      if (!this.profileEditing()) this.profilePhone.set(String(value.coach['phone'] ?? ''));
      this.loading.set(false);
      void this.loadPanels(String(value.coach['id']));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Coach portal could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPanels(coachId: string): Promise<void> {
    this.batchesLoading.set(true);
    this.batchesError.set('');
    let batches: CoachPortalData['batches'];
    try {
      batches = await this.portal.loadBatches(coachId);
      this.patchData({ batches });
      if (!this.selectedBatchId()) this.selectedBatchId.set(batches[0]?.id ?? '');
    } catch (error) {
      this.batchesError.set(error instanceof Error ? error.message : 'Batches could not be loaded.');
      return;
    } finally { this.batchesLoading.set(false); }

    const batchIds = batches.map((batch) => batch.id);
    await this.portal.unsubscribe(this.channels);
    this.channels = this.portal.subscribe(coachId, (panel) => {
      if (this.reloadTimer) clearTimeout(this.reloadTimer);
      this.reloadTimer = setTimeout(() => void this.reloadRealtimePanel(panel, coachId, batchIds), 200);
    });
    if ((this.view() === 'students' || this.view() === 'attendance')) void this.loadStudentPage();
    else void this.loadStudentsPanel(batchIds, batches);
    if (this.view() === 'history') void this.loadAttendancePage();
    else void this.loadAttendancePanel(batchIds);
    void this.loadSessionsPanel(batchIds);
    void this.loadNotificationsPanel(coachId);
  }

  private patchData(changes: Partial<CoachPortalData>): void {
    this.data.update((value) => value ? { ...value, ...changes } : value);
  }

  private async loadStudentsPanel(batchIds: readonly string[], batches: CoachPortalData['batches']): Promise<void> {
    this.studentsLoading.set(true); this.studentsError.set('');
    try {
      const students = await this.portal.loadStudents(batchIds, batches);
      this.patchData({ students });
      if (!this.selectedStudentId()) this.selectedStudentId.set(students[0]?.id ?? '');
    } catch (error) { this.studentsError.set(error instanceof Error ? error.message : 'Students could not be loaded.'); }
    finally { this.studentsLoading.set(false); }
  }

  private async loadAttendancePanel(batchIds: readonly string[]): Promise<void> {
    this.attendanceLoading.set(true); this.attendanceError.set('');
    try { this.patchData({ attendance: await this.portal.loadDashboardAttendance(batchIds) }); }
    catch (error) { this.attendanceError.set(error instanceof Error ? error.message : 'Attendance summary could not be loaded.'); }
    finally { this.attendanceLoading.set(false); }
  }

  private async loadSessionsPanel(batchIds: readonly string[]): Promise<void> {
    this.sessionsLoading.set(true); this.sessionsError.set('');
    try { this.patchData({ sessions: await this.portal.loadSessions(batchIds) }); }
    catch (error) { this.sessionsError.set(error instanceof Error ? error.message : 'Sessions could not be loaded.'); }
    finally { this.sessionsLoading.set(false); }
  }

  private async loadNotificationsPanel(coachId: string): Promise<void> {
    const request=++this.notificationRequest;
    this.notificationsLoading.set(true); this.notificationsError.set('');
    try {
      if(this.view()==='notifications'){
        const result=await this.portal.notificationPage(coachId,this.notificationPage(),this.pageSize(),this.notificationFilter());
        if(request!==this.notificationRequest)return;
        const last=Math.max(1,Math.ceil(result.total/this.pageSize()));
        if(this.notificationPage()>last){this.notificationPage.set(last);await this.loadNotificationsPanel(coachId);return;}
        this.notificationTotal.set(result.total);this.patchData({notifications:result.rows});
      }else{
        const notifications=await this.portal.loadNotifications(coachId);
        if(request===this.notificationRequest)this.patchData({notifications});
      }
    } catch (error) { if(request===this.notificationRequest)this.notificationsError.set(error instanceof Error ? error.message : 'Notifications could not be loaded.'); }
    finally { if(request===this.notificationRequest)this.notificationsLoading.set(false); }
  }
  protected changeNotificationPage(page:number):void{
    this.notificationPage.set(page);
    const id=this.data()?.coach.id;if(id)void this.loadNotificationsPanel(id);
  }

  private async reloadRealtimePanel(panel: 'attendance' | 'notifications', coachId: string, batchIds: readonly string[]): Promise<void> {
    if (panel === 'notifications') await this.loadNotificationsPanel(coachId);
    else if (this.view() === 'history') await this.loadAttendancePage();
    else await this.loadAttendancePanel(batchIds);
  }
  protected setSearch(e: Event): void {
    this.search.set((e.target as HTMLInputElement).value);
    this.page.set(1);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadStudentPage(), 250);
  }
  protected setBatchSearch(e: Event): void {
    this.batchSearch.set((e.target as HTMLInputElement).value);
  }
  protected setBatchStatus(status: string): void {
    this.batchStatus.set(status);
  }
  protected resetBatchFilters(): void {
    this.batchSearch.set('');
    this.batchStatus.set('all');
  }
  protected setStudentSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadStudentPage(), 250);
  }
  protected resetStudentFilters(): void {
    this.search.set('');
    this.statusFilter.set('');
    this.page.set(1);
    void this.loadStudentPage();
  }
  protected setBatch(e: Event): void {
    this.batchFilter.set((e.target as HTMLSelectElement).value);
    this.selectedBatchId.set(this.batchFilter() || this.data()?.batches[0]?.id || '');
    this.page.set(1);
    if ((this.view() === 'students' || this.view() === 'attendance')) void this.loadStudentPage();
    if (this.view() === 'history') void this.loadAttendancePage();
  }
  protected setStatus(e: Event): void {
    this.statusFilter.set((e.target as HTMLSelectElement).value);
    this.page.set(1);
    if ((this.view() === 'students' || this.view() === 'attendance')) void this.loadStudentPage();
    if (this.view() === 'history') void this.loadAttendancePage();
  }

  private async loadStudentPage(): Promise<void> {
    const batchIds = this.data()?.batches.map((batch) => batch.id) ?? [];
    const queryKey = JSON.stringify([batchIds, this.search(), this.batchFilter(), this.statusFilter(), this.page(), this.pageSize()]);
    const request = this.studentQueryGuard.begin(queryKey);
    if (request === null) return;
    this.studentsLoading.set(true);
    this.studentsError.set('');
    try {
      const result = await this.portal.searchStudents(
        batchIds, this.search(), this.batchFilter(), this.statusFilter(), this.page(), this.pageSize(),
      );
      if (!this.studentQueryGuard.isCurrent(request)) return;
      this.studentRows.set(result.rows);
      this.studentTotal.set(result.total);
    } catch (error) {
      if (this.studentQueryGuard.isCurrent(request))
        this.studentsError.set(error instanceof Error ? error.message : 'Students could not be loaded.');
    } finally {
      if (this.studentQueryGuard.isCurrent(request)) {
        this.studentsLoading.set(false);
        this.studentQueryGuard.finish(request);
      }
    }
  }

  private async loadAttendancePage(): Promise<void> {
    const batchIds = this.data()?.batches.map((batch) => batch.id) ?? [];
    const queryKey = JSON.stringify([batchIds, this.batchFilter(), this.selectedStudentId(), this.statusFilter(), this.page(), this.pageSize()]);
    const request = this.attendanceQueryGuard.begin(queryKey);
    if (request === null) return;
    this.attendanceLoading.set(true);
    this.attendanceError.set('');
    try {
      const result = await this.portal.attendanceHistory(
        batchIds, this.batchFilter(), this.selectedStudentId(), this.statusFilter(), this.page(), this.pageSize(),
      );
      if (!this.attendanceQueryGuard.isCurrent(request)) return;
      this.attendanceRows.set(result.rows);
      this.attendanceTotal.set(result.total);
    } catch (error) {
      if (this.attendanceQueryGuard.isCurrent(request))
        this.attendanceError.set(error instanceof Error ? error.message : 'Attendance history could not be loaded.');
    } finally {
      if (this.attendanceQueryGuard.isCurrent(request)) {
        this.attendanceLoading.set(false);
        this.attendanceQueryGuard.finish(request);
      }
    }
  }
  protected setScheduleType(e: Event): void {
    this.scheduleType.set((e.target as HTMLSelectElement).value);
  }
  protected changeScheduleWeek(delta: number): void {
    this.scheduleWeekOffset.update((value) => value + delta);
  }
  protected resetScheduleWeek(): void {
    this.scheduleWeekOffset.set(0);
  }
  protected setScheduleMode(mode: 'week' | 'day' | 'month'): void {
    this.scheduleMode.set(mode);
    this.scheduleWeekOffset.set(0);
  }
  protected chooseStudent(e: Event): void {
    this.selectedStudentId.set((e.target as HTMLSelectElement).value);
    this.page.set(1);
    if (this.view() === 'history') void this.loadAttendancePage();
  }
  protected selectStudent(studentId: string): void {
    this.selectedStudentId.set(studentId);
  }
  protected go(path: string): void {
    void this.router.navigateByUrl(path);
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  protected relation(row: CoachRow, key: string, field: string): string {
    const value = row[key];
    return value && typeof value === 'object'
      ? String((value as CoachRow)[field] ?? '')
      : '';
  }
  protected coachSpecializations(coach: CoachRow): string {
    const values = Array.isArray(coach['coach_specializations'])
      ? (coach['coach_specializations'] as readonly CoachRow[])
          .map((item) => String(item['specialization'] ?? ''))
          .filter(Boolean)
      : [];
    return values.join(', ') || 'Not provided';
  }
  protected time(value: unknown): string {
    if (!value) return '—';
    const text = String(value);
    if (text.includes('T'))
      return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(
        new Date(text),
      );
    const [h, m] = text.split(':').map(Number);
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(
      new Date(2000, 0, 1, h, m),
    );
  }
  protected age(student: CoachStudent): number {
    const birth = new Date(student.date_of_birth);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
    return age;
  }
  protected attendanceFor(studentId: string): number {
    const rows = (this.data()?.attendance ?? []).filter((r) => r['student_id'] === studentId);
    return rows.length
      ? Math.round((rows.filter((r) => r['status'] !== 'absent').length / rows.length) * 100)
      : 0;
  }
  protected studentAttendance(studentId: string): readonly CoachAttendanceRecord[] {
    return (this.data()?.attendance ?? []).filter((row) => row['student_id'] === studentId);
  }
  protected summaryStudents(): readonly CoachStudent[] {
    return (this.data()?.students ?? []).filter(
      (student) => !this.selectedBatchId() || student.batch_id === this.selectedBatchId(),
    );
  }
  protected studentAttendanceSummary(studentId: string): {
    present: number;
    absent: number;
    late: number;
  } {
    const rows = this.studentAttendance(studentId);
    return {
      present: rows.filter((row) => ['present', 'checked_out'].includes(String(row['status'])))
        .length,
      absent: rows.filter((row) => row['status'] === 'absent').length,
      late: rows.filter((row) => row['status'] === 'late').length,
    };
  }
  protected lastAttendance(studentId: string): CoachAttendanceRecord | null {
    return this.studentAttendance(studentId)[0] ?? null;
  }
  protected primaryParent(student: CoachStudent): CoachRow | null {
    const links = student.student_parents ?? [];
    return links.find((link) => link.is_primary)?.parent ?? links[0]?.parent ?? null;
  }
  protected studentBatch(student: CoachStudent) {
    return this.data()?.batches.find((batch) => batch.id === student.batch_id) ?? null;
  }
  protected medical(student: CoachStudent): CoachRow | null {
    return student.student_medical_records?.[0] ?? null;
  }
  protected address(value: unknown): string {
    if (!value || typeof value !== 'object') return 'Not provided';
    const item = value as CoachRow;
    return String(item['formatted'] ?? item['address'] ?? item['line1'] ?? 'Not provided');
  }
  protected batchStudentCount(batchId: string): number {
    return (this.data()?.students ?? []).filter((student) => student.batch_id === batchId).length;
  }
  protected batchAttendance(batchId: string): {
    present: number;
    absent: number;
    late: number;
    rate: number;
  } {
    const rows = (this.data()?.attendance ?? []).filter((row) => row['batch_id'] === batchId);
    const present = rows.filter((row) =>
      ['present', 'checked_out'].includes(String(row['status'])),
    ).length;
    const absent = rows.filter((row) => row['status'] === 'absent').length;
    const late = rows.filter((row) => row['status'] === 'late').length;
    return {
      present,
      absent,
      late,
      rate: rows.length ? Math.round(((present + late) / rows.length) * 100) : 0,
    };
  }
  protected batchDays(batch: CoachPortalData['batches'][number]): string {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      batch.batch_days
        .map((day) => labels[day.day_of_week] ?? '')
        .filter(Boolean)
        .join(', ') || 'Not scheduled'
    );
  }
  protected nextSession(batchId: string): CoachSession | null {
    const today = new Date().toISOString().slice(0, 10);
    return (
      (this.data()?.sessions ?? []).find(
        (session) => session['batch_id'] === batchId && String(session['session_date']) >= today,
      ) ?? null
    );
  }
  protected batchSessions(batchId: string, upcoming: boolean): readonly CoachSession[] {
    const today = new Date().toISOString().slice(0, 10);
    const rows = (this.data()?.sessions ?? []).filter(
      (session) =>
        session['batch_id'] === batchId &&
        (upcoming
          ? String(session['session_date']) >= today
          : String(session['session_date']) < today),
    );
    return upcoming ? rows.slice(0, 5) : [...rows].reverse().slice(0, 5);
  }
  protected sessionsForDay(day: Date): readonly CoachSession[] {
    const key = this.dateKey(day);
    return (this.data()?.sessions ?? []).filter(
      (session) =>
        session['session_date'] === key &&
        (!this.batchFilter() || session['batch_id'] === this.batchFilter()) &&
        (!this.scheduleType() ||
          String(session['title']).toLowerCase().includes(this.scheduleType().toLowerCase())),
    );
  }
  protected dateKey(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  protected isToday(value: Date): boolean {
    return this.dateKey(value) === this.todayDate();
  }
  protected openAttendance(studentId: string): CoachAttendanceRecord | null {
    const today = new Date().toISOString().slice(0, 10);
    return (
      this.data()?.attendance.find(
        (r) =>
          r['student_id'] === studentId &&
          r['attendance_date'] === today &&
          r['check_in_at'] &&
          !r['check_out_at'],
      ) ?? null
    );
  }
  protected todayRecord(studentId: string): CoachAttendanceRecord | null {
    return this.todayAttendance().find((row) => row['student_id'] === studentId) ?? null;
  }
  protected todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }
  protected async submitAttendance(): Promise<void> {
    const checkOut = this.attendanceMode() === 'check-out';
    const student = this.selectedStudent();
    const batchId = this.selectedBatchId() || student?.batch_id;
    if (!student || !batchId) {
      this.actionMessage.set('Select an assigned batch and student.');
      return;
    }
    this.submitting.set(true);
    this.actionMessage.set('');
    try {
      if (!this.attendanceOutbox.online()) throw new Error('Attendance requires an online API connection. Reconnect and try again.');
      if (checkOut) {
        const record = this.openAttendance(student.id);
        if (!record) throw new Error('This student does not have an open check-in today.');
        await this.portal.checkOut(String(record['id']));
      } else await this.portal.checkIn(student.id, batchId);
      this.actionMessage.set(
        checkOut ? 'Check-out saved successfully.' : 'Attendance saved successfully.',
      );
      await this.load();
    } catch (error) {
      this.actionMessage.set(
        error instanceof Error ? error.message : 'Attendance could not be saved.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
  protected async scan(): Promise<void> {
    if (!this.qrToken().trim() || !this.selectedBatchId()) {
      this.actionMessage.set('Select a batch and enter a QR token.');
      return;
    }
    if (!this.attendanceOutbox.online()) {
      this.actionMessage.set(
        'QR scanning needs a connection. Select the student and use the check-in button instead.',
      );
      return;
    }
    this.submitting.set(true);
    try {
      const outcome = await this.portal.scan(this.qrToken(), this.selectedBatchId());
      this.actionMessage.set(
        outcome === 'checked-out'
          ? 'QR check-out saved successfully.'
          : 'QR check-in saved successfully.',
      );
      this.qrToken.set('');
      await this.load();
    } catch (error) {
      this.actionMessage.set(error instanceof Error ? error.message : 'QR attendance failed.');
    } finally {
      this.submitting.set(false);
    }
  }
  protected async startQrCamera(): Promise<void> {
    this.actionMessage.set('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      this.scanner = new Html5Qrcode('coach-qr-reader');
      await this.scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (token) => {
          if (this.submitting()) return;
          this.qrToken.set(token);
          void this.stopQrCamera().then(() => this.scan());
        },
        () => undefined,
      );
      this.cameraActive.set(true);
    } catch {
      this.actionMessage.set(
        'Camera access is unavailable. Allow camera permission or enter the QR token manually.',
      );
      await this.stopQrCamera();
    }
  }
  protected async stopQrCamera(): Promise<void> {
    try {
      if (this.scanner?.isScanning) await this.scanner.stop();
    } catch {
      // The scanner may already have stopped after a browser permission change.
    }
    this.scanner?.clear();
    this.scanner = undefined;
    this.cameraActive.set(false);
  }
  protected async markRemainingPresent(): Promise<void> {
    const batchId = this.selectedBatchId();
    if (!batchId) {
      this.actionMessage.set('Select an assigned batch first.');
      return;
    }
    const studentIds = this.filteredStudents()
      .filter((student) => !this.todayRecord(student.id))
      .map((student) => student.id);
    if (!studentIds.length) {
      this.actionMessage.set('Every visible student already has attendance for today.');
      return;
    }
    if (!(await this.dialogs.confirm(`Mark ${studentIds.length} unmarked students present for today?`, 'Confirm bulk attendance', 'Mark present'))) return;
    this.submitting.set(true);
    try {
      const count = await this.portal.markBatchPresent(batchId, studentIds);
      this.actionMessage.set(`${count} attendance record${count === 1 ? '' : 's'} saved.`);
      await this.load();
    } catch (error) {
      this.actionMessage.set(error instanceof Error ? error.message : 'Bulk attendance failed.');
    } finally {
      this.submitting.set(false);
    }
  }
  protected async markNotificationRead(id: string): Promise<void> {
    try {
      await this.portal.markNotificationRead(id);
      await this.load();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Notification could not be updated.');
    }
  }
  protected async markAllNotificationsRead(): Promise<void> {
    this.submitting.set(true);
    try {
      await this.portal.markAllNotificationsRead();
      this.actionMessage.set('All notifications marked as read.');
      await this.load();
    } catch (error) {
      this.actionMessage.set(
        error instanceof Error ? error.message : 'Notifications could not be updated.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
  protected async requestAttendanceCorrection(): Promise<void> {
    if (!this.correctionAttendanceId() || this.correctionReason().trim().length < 3) {
      this.actionMessage.set('Select an attendance record and enter a reason.');
      return;
    }
    this.submitting.set(true);
    try {
      await this.portal.requestAttendanceCorrection(
        this.correctionAttendanceId(),
        { status: this.correctionStatus() },
        this.correctionReason(),
      );
      this.correctionReason.set('');
      this.actionMessage.set('Correction request submitted for academy review.');
    } catch (error) {
      this.actionMessage.set(error instanceof Error ? error.message : 'Correction request failed.');
    } finally {
      this.submitting.set(false);
    }
  }
  protected exportAttendance(): void {
    const headers = [
      'Date',
      'Student',
      'Batch',
      'Check in',
      'Check out',
      'Status',
      'Source',
      'Remarks',
    ];
    const rows = this.filteredAttendance().map((record) => [
      record['attendance_date'],
      this.relation(record, 'student', 'full_name'),
      this.relation(record, 'batch', 'name'),
      record['check_in_at'] ?? '',
      record['check_out_at'] ?? '',
      record['status'] ?? '',
      record['source'] ?? '',
      record['remarks'] ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `coach-attendance-${this.todayDate()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  protected beginProfileEdit(): void {
    this.profilePhone.set(String(this.data()?.coach['phone'] ?? ''));
    this.profileEditing.set(true);
    this.profilePhoto.set(null);
    this.actionMessage.set('');
  }
  protected async saveProfile(): Promise<void> {
    if (this.profilePhone().replace(/\D/g, '').length < 10) {
      this.actionMessage.set('Enter a valid phone number with at least 10 digits.');
      return;
    }
    this.submitting.set(true);
    try {
      await this.portal.updateOwnProfile(
        String(this.data()?.coach['id']),
        this.profilePhone(),
        this.profilePhoto(),
      );
      this.profileEditing.set(false);
      this.actionMessage.set('Profile updated successfully.');
      await this.load();
    } catch (error) {
      this.actionMessage.set(
        error instanceof Error ? error.message : 'Profile could not be updated.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
  protected chooseProfilePhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.actionMessage.set('Choose a JPG, PNG or WebP image.');
      this.profilePhoto.set(null);
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      this.actionMessage.set('Profile photo must be 5 MB or smaller.');
      this.profilePhoto.set(null);
      return;
    }
    this.profilePhoto.set(file);
    this.actionMessage.set('');
  }
  protected setNotificationFilter(filter: 'all' | 'unread' | 'read'): void {
    this.notificationFilter.set(filter);
    this.changeNotificationPage(1);
  }
  protected resetNotificationFilters(): void {
    this.notificationFilter.set('all');
    this.changeNotificationPage(1);
  }
  protected resetAttendanceFilters(): void {
    this.batchFilter.set('');
    this.statusFilter.set('');
    this.page.set(1);
    if (this.view() === 'history') void this.loadAttendancePage();
  }
  protected setPage(value: number): void {
    this.page.set(value);
    if ((this.view() === 'students' || this.view() === 'attendance')) void this.loadStudentPage();
    if (this.view() === 'history') void this.loadAttendancePage();
  }
  protected setPageSize(value: number): void {
    this.pageSize.set(value);
    this.page.set(1);
    if(this.view()==='notifications')this.changeNotificationPage(1);
    if ((this.view() === 'students' || this.view() === 'attendance')) void this.loadStudentPage();
    if (this.view() === 'history') void this.loadAttendancePage();
  }
}
