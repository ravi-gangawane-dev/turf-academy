import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CoachDetailRecord, CoachesService } from '../../core/supabase/domain-services';
import { CoachAttendanceSummary, StaffDetailsService } from '../../core/supabase/staff-details.service';
import { PrintDocumentService } from '../../shared/print/print-document.service';
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
  const printDocuments = { printIdCard: vi.fn().mockResolvedValue(undefined) };
  TestBed.configureTestingModule({ providers: [provideRouter([]),
    { provide: CoachesService, useValue: {} },
    { provide: StaffDetailsService, useValue: { attendance } },
    { provide: PrintDocumentService, useValue: printDocuments },
  ] });
  const page = TestBed.createComponent(CoachDetailsPage).componentInstance;
  page['from'] = '2026-09-01'; page['to'] = '2026-09-30';
  return { page, first, second, attendance, printDocuments };
}
const rows: CoachAttendanceSummary[] = [{ batch_id: 'latest', batch_name: 'Morning', present: 3, late: 0, absent: 0, total: 3 }];

const coachRecord: CoachDetailRecord = {
  id: 'coach-1',
  profile_id: null,
  employee_code: 'EMP-42',
  full_name: 'Coach Rao',
  phone: '+91 98765 43210',
  email: 'rao@example.com',
  date_of_birth: '1988-04-12',
  experience_years: 8,
  qualification: 'BCCI Level 2',
  biography: null,
  photo_path: null,
  photo_url: null,
  status: 'active',
  created_at: '2024-06-01T00:00:00Z',
  coach_specializations: [{ specialization: 'Batting' }, { specialization: 'Fielding' }],
  batch_coaches: [
    {
      is_primary: true,
      batch: {
        id: 'b1',
        code: 'B-MOR',
        name: 'Morning Elite',
        age_group: 'U-14',
        skill_level: 'Intermediate',
        start_time: '06:30:00',
        end_time: '08:00:00',
        status: 'active',
      },
    },
  ],
};

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

  it('prepares a coach ID card from live specialisations and batches', async () => {
    const { page, printDocuments } = setup();
    page['coach'].set(coachRecord);

    expect(page['idCard']()).toMatchObject({
      holderType: 'coach',
      holderId: 'coach-1',
      fullName: 'Coach Rao',
      holderCode: 'EMP-42',
      subtitle: 'Batting, Fielding',
      cardNumber: 'ID-COA-EMP42',
      photoUrl: null,
      validityNote: 'Valid while employed at the academy',
    });
    expect(page['idCard']()?.details).toContainEqual({
      label: 'Batches',
      value: 'Morning Elite',
    });

    page['openIdCard']();
    expect(page['idCardOpen']()).toBe(true);
    await page['printIdCard']('preview');

    expect(printDocuments.printIdCard).toHaveBeenCalledWith(
      expect.objectContaining({
        cardNumber: 'ID-COA-EMP42',
        holderId: 'coach-1',
        subtitle: 'Batting, Fielding',
      }),
      'preview',
    );
    expect(page['idCardOpen']()).toBe(false);
  });
});
