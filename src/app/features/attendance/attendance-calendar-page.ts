import { AttendanceViewNavigation } from './attendance-view-navigation';
import { TableTools } from '../../shared/data-table/table-tools';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  AttendanceCalendarService,
  AttendanceCalendarResult,
  AttendanceCalendarListResult,
  AttendanceCalendarWeekResult,
  AttendanceDateRange,
} from '../../core/supabase/attendance-calendar.service';
import { BatchesService, StudentsService } from '../../core/supabase/domain-services';
import { AcademyFacade } from '../../core/state/academy.facade';
import { API_CONFIG } from '../../core/config/api.config';
import { readAllPages } from '../../core/supabase/read-all-pages';
import { Pagination } from '../../shared/pagination/pagination';
import { PageHero } from '../../shared/page-hero/page-hero';
import { buildAttendanceCalendarCsv } from './attendance-calendar-export';

type ViewMode = 'month' | 'week' | 'list';
@Component({
  selector: 'app-attendance-calendar-page',
  imports: [AttendanceViewNavigation, TableTools, FormsModule, DatePipe, Pagination, PageHero],
  templateUrl: './attendance-calendar-page.html',
  styleUrl: './attendance-calendar-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceCalendarPage implements OnInit {
  private readonly calendar = inject(AttendanceCalendarService);
  private readonly store = inject(AcademyFacade);
  private readonly batches = inject(BatchesService);
  private readonly students = inject(StudentsService);
  private readonly mock = inject(API_CONFIG).useMockApi;
  private request = 0;
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly optionsError = signal('');
  protected readonly viewMode = signal<ViewMode>('month');
  protected readonly selectedBatch = signal('');
  protected readonly selectedStudent = signal('');
  protected readonly selectedStatus = signal('');
  protected readonly selectedDate = signal(this.monthValue(new Date()));
  protected readonly selectedWeek = signal(1);
  protected readonly selectedRange = signal<AttendanceDateRange | null>(
    this.calendarMonthRange(this.selectedDate()),
  );
  protected readonly rangeError = signal('');
  protected readonly activePreset = signal('month');
  protected readonly dateRangeStart = signal(this.calendarMonthRange(this.selectedDate()).from);
  protected readonly dateRangeEnd = signal(this.calendarMonthRange(this.selectedDate()).to);
  protected readonly rangePickerOpen = signal(false);
  protected readonly rangePickerMonth = signal(this.monthValue(new Date()));
  protected readonly draftRangeStart = signal('');
  protected readonly draftRangeEnd = signal('');
  protected readonly rangePickerDays = computed(() => {
    const [year, month] = this.rangePickerMonth().split('-').map(Number);
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const lastDay = new Date(year, month, 0).getDate();
    const previousLastDay = new Date(year, month - 1, 0).getDate();
    const days: { date: string; day: number; outsideMonth: boolean }[] = Array.from(
      { length: firstWeekday },
      (_, index) => ({
        date: this.dateValue(new Date(year, month - 2, previousLastDay - firstWeekday + index + 1)),
        day: previousLastDay - firstWeekday + index + 1,
        outsideMonth: true,
      }),
    );
    for (let day = 1; day <= lastDay; day++) {
      days.push({ date: `${this.rangePickerMonth()}-${String(day).padStart(2, '0')}`, day, outsideMonth: false });
    }
    for (let day = 1; days.length < 42; day++) {
      days.push({ date: this.dateValue(new Date(year, month, day)), day, outsideMonth: true });
    }
    return days;
  });
  protected readonly dateRangeLabel = computed(() => {
    const from = this.dateRangeStart();
    const to = this.dateRangeEnd();
    if (!from || !to) return 'Choose date range';
    return `${this.formatDate(from)} – ${this.formatDate(to)}`;
  });
  protected readonly currentYear = computed(() => Number(this.selectedDate().slice(0, 4)));
  protected readonly currentMonth = computed(() => Number(this.selectedDate().slice(5, 7)));
  protected readonly weeks = computed(() =>
    Array.from(
      {
        length: Math.ceil(
          (new Date(this.currentYear(), this.currentMonth() - 1, 1).getDay() +
            new Date(this.currentYear(), this.currentMonth(), 0).getDate()) /
            7,
        ),
      },
      (_, i) => i + 1,
    ),
  );
  protected readonly monthName = computed(() =>
    new Date(this.currentYear(), this.currentMonth() - 1, 1).toLocaleString('en-IN', {
      month: 'long',
    }),
  );
  protected readonly calendarData = signal<AttendanceCalendarResult | null>(null);
  protected readonly weekData = signal<AttendanceCalendarWeekResult | null>(null);
  protected readonly listData = signal<AttendanceCalendarListResult | null>(null);
  protected readonly listPage = signal(1);
  protected readonly listPageSize = signal(50);
  protected readonly allBatches = signal<readonly { id: string; name: string }[]>([]);
  protected readonly allStudents = signal<readonly { id: string; name: string }[]>([]);
  protected readonly todayDate = new Date().getDate();
  protected readonly todayValue = this.dateValue(new Date());
  protected readonly isCurrentMonth = computed(
    () => this.selectedDate() === this.monthValue(new Date()),
  );

  constructor() {
    effect(() => {
      this.selectedBatch();
      this.selectedStudent();
      this.selectedStatus();
      this.selectedDate();
      this.selectedRange();
      this.selectedWeek();
      this.viewMode();
      this.listPage();
      this.listPageSize();
      untracked(() => void this.loadCalendarData());
    });
  }
  async ngOnInit(): Promise<void> {
    if (this.mock) {
      this.allBatches.set(this.store.batches());
      this.allStudents.set(this.store.students());
      return;
    }
    try {
      const [batches, students] = await Promise.all([
        this.batches.list(),
        readAllPages('List students', (offset, limit) =>
          this.students.list('', offset, offset + limit - 1),
        ),
      ]);
      this.allBatches.set(batches.map((row) => ({ id: String(row.id), name: String(row.name) })));
      this.allStudents.set(
        students.map((row) => ({ id: String(row.id), name: String(row.full_name) })),
      );
    } catch {
      this.optionsError.set('Filter choices could not be loaded. Please reload the page.');
    }
  }
  private async loadCalendarData(): Promise<void> {
    const request = ++this.request;
    this.loading.set(true);
    this.error.set('');
    this.calendarData.set(null);
    this.weekData.set(null);
    this.listData.set(null);
    const year = this.currentYear(),
      month = this.currentMonth();
    const batch = this.selectedBatch() || undefined,
      student = this.selectedStudent() || undefined,
      status = this.selectedStatus() || undefined,
      dateRange = this.selectedRange() ?? undefined;
    try {
      if (this.viewMode() === 'month') {
        const data = await this.calendar.getMonthStats(year, month, batch, student, status, dateRange);
        if (request === this.request) this.calendarData.set(data);
      } else if (this.viewMode() === 'week') {
        const data = await this.calendar.getWeekStats(
          year,
          month,
          this.selectedWeek(),
          batch,
          student,
          status,
          dateRange,
        );
        if (request === this.request) this.weekData.set(data);
      } else {
        const data = await this.calendar.getListView(
          year,
          month,
          batch,
          student,
          status,
          this.listPage(),
          this.listPageSize(),
          dateRange,
        );
        if (request === this.request) this.listData.set(data);
      }
    } catch (error) {
      if (request === this.request)
        this.error.set(
          error instanceof Error ? error.message : 'Attendance could not be loaded. Please retry.',
        );
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }
  protected onViewModeChange(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.listPage.set(1);
  }
  protected onBatchChange(event: Event): void {
    this.selectedBatch.set((event.target as HTMLSelectElement).value);
    this.selectedStudent.set('');
    this.listPage.set(1);
  }
  protected onStudentChange(event: Event): void {
    this.selectedStudent.set((event.target as HTMLSelectElement).value);
    this.listPage.set(1);
  }
  protected onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
    this.listPage.set(1);
  }
  protected onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      this.selectMonth(value);
      this.rangePickerMonth.set(value);
    }
  }
  private selectMonth(value: string): void {
    this.activePreset.set('month');
    this.dateRangeStart.set('');
    this.dateRangeEnd.set('');
    this.rangeError.set('');
    this.selectedRange.set(null);
    this.setMonth(value);
  }
  protected setPreset(preset: 'today' | 'week' | 'month' | 'quarter' | 'half-year' | 'year'): void {
    const now = new Date();
    let from: Date;
    let to: Date;
    if (preset === 'today') {
      from = this.startOfDay(now);
      to = this.startOfDay(now);
    } else if (preset === 'week') {
      from = this.startOfDay(now);
      from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
      to = new Date(from);
      to.setDate(from.getDate() + 6);
    } else if (preset === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'quarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), quarterStartMonth, 1);
      to = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
    } else if (preset === 'half-year') {
      const halfStartMonth = now.getMonth() < 6 ? 0 : 6;
      from = new Date(now.getFullYear(), halfStartMonth, 1);
      to = new Date(now.getFullYear(), halfStartMonth + 6, 0);
    } else {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
    }
    this.activePreset.set(preset);
    this.rangeError.set('');
    this.dateRangeStart.set(this.dateValue(from));
    this.dateRangeEnd.set(this.dateValue(to));
    this.rangePickerOpen.set(false);
    this.draftRangeStart.set(this.dateValue(from));
    this.draftRangeEnd.set(this.dateValue(to));
    this.selectedRange.set({ from: this.dateValue(from), to: this.dateValue(to) });
    this.setMonth(this.monthValue(from));
    this.selectedWeek.set(1);
    const firstWeekday = new Date(from.getFullYear(), from.getMonth(), 1).getDay();
    this.selectedWeek.set(Math.floor((firstWeekday + from.getDate() - 1) / 7) + 1);
  }
  protected toggleRangePicker(): void {
    if (this.rangePickerOpen()) {
      this.rangePickerOpen.set(false);
      return;
    }
    this.draftRangeStart.set(this.dateRangeStart());
    this.draftRangeEnd.set(this.dateRangeEnd());
    const anchor = this.dateRangeStart() || this.dateValue(new Date());
    this.rangePickerMonth.set(this.monthValue(new Date(`${anchor}T12:00:00`)));
    this.rangePickerOpen.set(true);
  }
  protected changeRangePickerMonth(offset: number): void {
    const [year, month] = this.rangePickerMonth().split('-').map(Number);
    this.rangePickerMonth.set(this.monthValue(new Date(year, month - 1 + offset, 1)));
  }
  protected chooseRangeDate(date: string): void {
    const start = this.draftRangeStart();
    const end = this.draftRangeEnd();
    if (!start || end || date < start) {
      this.draftRangeStart.set(date);
      this.draftRangeEnd.set('');
      this.rangePickerMonth.set(this.monthValue(new Date(`${date}T12:00:00`)));
      return;
    }
    this.draftRangeEnd.set(date);
  }
  protected applyDateRange(): void {
    const from = this.draftRangeStart();
    const to = this.draftRangeEnd();
    if (!from || !to) {
      this.rangeError.set('Choose both a start and end date.');
      return;
    }
    if (from > to) {
      this.rangeError.set('Start date must be on or before end date.');
      return;
    }
    this.dateRangeStart.set(from);
    this.dateRangeEnd.set(to);
    this.selectedRange.set({ from, to });
    this.activePreset.set('custom');
    this.rangeError.set('');
    const startDate = new Date(`${from}T12:00:00`);
    this.setMonth(this.monthValue(startDate));
    const firstWeekday = new Date(startDate.getFullYear(), startDate.getMonth(), 1).getDay();
    this.selectedWeek.set(Math.floor((firstWeekday + startDate.getDate() - 1) / 7) + 1);
    this.rangePickerOpen.set(false);
  }
  protected cancelDateRange(): void {
    this.draftRangeStart.set(this.dateRangeStart());
    this.draftRangeEnd.set(this.dateRangeEnd());
    this.rangePickerOpen.set(false);
  }
  protected isRangeCalendarDateSelected(date: string): boolean {
    return date === this.draftRangeStart() || date === this.draftRangeEnd();
  }
  protected isRangeCalendarDateInRange(date: string): boolean {
    const from = this.draftRangeStart();
    const to = this.draftRangeEnd();
    return !!from && !!to && date >= from && date <= to;
  }
  protected formatDate(value: string): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }
  private calendarMonthRange(value: string): AttendanceDateRange {
    const [year, month] = value.split('-').map(Number);
    return { from: `${value}-01`, to: this.dateValue(new Date(year, month, 0)) };
  }
  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  private dateValue(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  private setMonth(value: string): void {
    this.selectedDate.set(value);
    this.selectedWeek.set(1);
    this.listPage.set(1);
  }
  protected onTodayClick(): void {
    this.setPreset('today');
  }
  protected onPreviousMonth(): void {
    this.selectMonth(this.monthValue(new Date(this.currentYear(), this.currentMonth() - 2, 1)));
  }
  protected onNextMonth(): void {
    this.selectMonth(this.monthValue(new Date(this.currentYear(), this.currentMonth(), 1)));
  }
  protected onPageChange(page: number): void {
    this.listPage.set(page);
  }
  protected onPageSizeChange(size: number): void {
    this.listPageSize.set(size);
    this.listPage.set(1);
  }
  protected export(): void {
    if (this.loading() || this.error()) return;
    const week = this.weekData();
    const csv = buildAttendanceCalendarCsv({
      view: this.viewMode(),
      monthLabel: `${this.monthName()} ${this.currentYear()}`,
      batchLabel:
        this.allBatches().find((row) => row.id === this.selectedBatch())?.name ?? 'All batches',
      studentLabel:
        this.allStudents().find((row) => row.id === this.selectedStudent())?.name ?? 'All students',
      statusLabel: this.selectedStatus() || 'All statuses',
      dateRange: week ? `${week.startDate} to ${week.endDate}` : undefined,
      stats: this.viewMode() === 'week' ? week?.weekStats : this.calendarData()?.monthStats,
      list: this.listData() ?? undefined,
    });
    if (!csv) return;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-calendar-${this.selectedDate()}-${this.viewMode()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  private monthValue(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  protected percentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
}
