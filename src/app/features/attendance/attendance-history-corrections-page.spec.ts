import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { signal } from '@angular/core';
import { AttendanceHistoryCorrectionsPage } from './attendance-history-corrections-page';
import { AttendanceService, StudentsService } from '../../core/supabase/domain-services';
import { AcademyFacade } from '../../core/state/academy.facade';
import { API_CONFIG } from '../../core/config/api.config';

async function setup(url = '/attendance/history') {
  const attendance = {
    history: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    correctionPage: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1 }),
    correct: vi.fn().mockResolvedValue(null),
    resolveCorrection: vi.fn().mockResolvedValue(null),
  };
  const students = {
    list: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'attendance/history', component: AttendanceHistoryCorrectionsPage },
        {
          path: 'attendance/correction',
          component: AttendanceHistoryCorrectionsPage,
          data: { tab: 'corrections' },
        },
      ]),
      { provide: AttendanceService, useValue: attendance },
      { provide: StudentsService, useValue: students },
      { provide: API_CONFIG, useValue: { useMockApi: false } },
      {
        provide: AcademyFacade,
        useValue: { students: signal([]), batches: signal([]), attendance: signal([]) },
      },
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  return { harness, attendance };
}

const tabButton = (root: HTMLElement, label: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('.view-tabs button')].find((button) =>
    button.textContent?.includes(label),
  )!;

describe('Attendance history and corrections page', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('opens on the history tab with a single heading and two tabs', async () => {
    const { harness } = await setup();
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toContain('Attendance History & Corrections');
    expect(root.querySelectorAll('.view-tabs button').length).toBe(2);
    expect(root.querySelector('app-attendance-history-page')).not.toBeNull();
    expect(root.querySelector('app-attendance-correction-page')).toBeNull();
    expect(tabButton(root, 'Attendance History').getAttribute('aria-selected')).toBe('true');
  });

  it('switches to the corrections queue and records the tab in the URL', async () => {
    const { harness } = await setup();
    const root = harness.routeNativeElement as HTMLElement;

    tabButton(root, 'Attendance Corrections').click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(root.querySelector('app-attendance-correction-page')).not.toBeNull();
    expect(root.querySelector('app-attendance-history-page')).toBeNull();
    expect(tabButton(root, 'Attendance Corrections').getAttribute('aria-selected')).toBe('true');
    expect(TestBed.inject(Router).url).toContain('tab=corrections');
  });

  it('keeps the old correction route pointing at the corrections tab', async () => {
    const { harness } = await setup('/attendance/correction');
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('app-attendance-correction-page')).not.toBeNull();
    expect(tabButton(root, 'Attendance Corrections').getAttribute('aria-selected')).toBe('true');
  });

  it('shows the correction form beside the records', async () => {
    const { harness } = await setup();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('.correction-form h2')?.textContent).toContain(
      'Make Attendance Correction',
    );
    expect(root.querySelector('.correction-form .rail-hint')?.textContent).toContain(
      'Correct an existing record',
    );
    expect(root.querySelector('app-table-tools .table-filters')).not.toBeNull();
  });

  it('shows the correction queue on the corrections tab', async () => {
    const { harness } = await setup('/attendance/correction');
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('.correction-page app-table-tools')?.textContent).toContain(
      'Attendance corrections',
    );
    expect(root.querySelector('.correction-form')).toBeNull();
  });
});
