import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AttendanceCalendarPage } from './attendance-calendar-page';
import { AttendanceCalendarService } from '../../core/supabase/attendance-calendar.service';
import { AcademyFacade } from '../../core/state/academy.facade';
import { BatchesService, StudentsService } from '../../core/supabase/domain-services';
import { API_CONFIG } from '../../core/config/api.config';

describe('Attendance calendar controls', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('selects date presets and applies a custom date range', () => {
    const calendar = { getMonthStats: vi.fn() };
    TestBed.configureTestingModule({
      imports: [AttendanceCalendarPage],
      providers: [
        provideRouter([]),
        { provide: AttendanceCalendarService, useValue: calendar },
        { provide: AcademyFacade, useValue: { students: signal([]), batches: signal([]) } },
        { provide: StudentsService, useValue: {} },
        { provide: BatchesService, useValue: {} },
        { provide: API_CONFIG, useValue: { useMockApi: true } },
      ],
    });
    const component = TestBed.createComponent(AttendanceCalendarPage).componentInstance;
    component['setPreset']('quarter');
    const now = new Date();
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    expect(component['selectedRange']()).toEqual({
      from: `${now.getFullYear()}-${String(quarterStart + 1).padStart(2, '0')}-01`,
      to: `${now.getFullYear()}-${String(quarterStart + 3).padStart(2, '0')}-${String(new Date(now.getFullYear(), quarterStart + 3, 0).getDate()).padStart(2, '0')}`,
    });

    component['toggleRangePicker']();
    component['chooseRangeDate']('2026-10-10');
    component['chooseRangeDate']('2026-10-15');
    component['applyDateRange']();
    expect(component['selectedRange']()).toEqual({ from: '2026-10-10', to: '2026-10-15' });
    expect(component['activePreset']()).toBe('custom');
    expect(component['rangePickerOpen']()).toBe(false);
  });

  it('navigates one month, resets pagination on filters and forwards list page size', async () => {
    const calendar = {
      getMonthStats: vi.fn().mockResolvedValue(null),
      getListView: vi.fn().mockResolvedValue({ records: [], total: 0, page: 1, pageSize: 10 }),
    };
    TestBed.configureTestingModule({
      imports: [AttendanceCalendarPage],
      providers: [
        provideRouter([]),
        { provide: AttendanceCalendarService, useValue: calendar },
        { provide: AcademyFacade, useValue: { students: signal([]), batches: signal([]) } },
        { provide: StudentsService, useValue: {} },
        { provide: BatchesService, useValue: {} },
        { provide: API_CONFIG, useValue: { useMockApi: true } },
      ],
    });
    const fixture = TestBed.createComponent(AttendanceCalendarPage),
      component = fixture.componentInstance;
    component['selectedDate'].set('2026-10');
    component['onNextMonth']();
    expect(component['selectedDate']()).toBe('2026-11');
    component['onPreviousMonth']();
    expect(component['selectedDate']()).toBe('2026-10');
    component['onViewModeChange']('list');
    component['onPageChange'](3);
    component['onStatusChange']({ target: { value: 'late' } } as unknown as Event);
    component['onPageSizeChange'](10);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(calendar.getListView).toHaveBeenCalledTimes(1);
    expect(calendar.getListView).toHaveBeenLastCalledWith(
      2026,
      10,
      undefined,
      undefined,
      'late',
      1,
      10,
      undefined,
    );
    component['onPageChange'](2);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(calendar.getListView).toHaveBeenLastCalledWith(
      2026,
      10,
      undefined,
      undefined,
      'late',
      2,
      10,
      undefined,
    );
  });
});
