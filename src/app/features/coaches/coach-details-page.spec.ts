import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CoachesService } from '../../core/supabase/domain-services';
import { CoachAttendanceSummary, StaffDetailsService } from '../../core/supabase/staff-details.service';
import { CoachDetailsPage } from './coach-details-page';

function deferred() {
  let resolve!: (rows: CoachAttendanceSummary[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<CoachAttendanceSummary[]>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  const first = deferred(), second = deferred();
  const attendance = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  TestBed.configureTestingModule({ providers: [provideRouter([]),
    { provide: CoachesService, useValue: {} },
    { provide: StaffDetailsService, useValue: { attendance } },
  ] });
  const page = TestBed.createComponent(CoachDetailsPage).componentInstance;
  page['from'] = '2026-09-01'; page['to'] = '2026-09-30';
  return { page, first, second, attendance };
}
const rows: CoachAttendanceSummary[] = [{ batch_id: 'latest', batch_name: 'Morning', present: 3, late: 0, absent: 0, total: 3 }];

describe('Coach attendance request ordering', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('keeps the newest response when an older request finishes last', async () => {
    const { page, first, second, attendance } = setup();
    const old = page['showAttendance']();
    page['from'] = '2026-09-15';
    const latest = page['showAttendance']();
    second.resolve(rows); await latest;
    first.resolve([]); await old;
    expect(page['attendance']()).toEqual(rows);
    expect(attendance.mock.calls.map(call => call.slice(1))).toEqual([
      ['2026-09-01', '2026-09-30'], ['2026-09-15', '2026-09-30'],
    ]);
  });
  it('ignores old errors and keeps loading until the current request finishes', async () => {
    const { page, first, second } = setup();
    const old = page['showAttendance']();
    const latest = page['showAttendance']();
    first.reject(new Error('Old failure')); await old;
    expect(page['error']()).toBe('');
    expect(page['summaryLoading']()).toBe(true);
    second.resolve(rows); await latest;
    expect(page['summaryLoading']()).toBe(false);
  });
  it('invalidates pending results when a newer date range is invalid', async () => {
    const { page, first } = setup();
    const old = page['showAttendance']();
    page['to'] = '2026-08-01';
    await page['showAttendance']();
    first.resolve(rows); await old;
    expect(page['attendance']()).toEqual([]);
    expect(page['error']()).toBe('Enter a valid date range.');
    expect(page['summaryLoading']()).toBe(false);
  });
});
