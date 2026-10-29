import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { StudentListService, StudentWorkspace } from './student-list.service';
import { StudentDetailsPage } from './student-details-page';

const workspace = {
  student: {
    id: 's1',
    studentCode: 'ST-1',
    status: 'active',
    fullName: 'Aarav Sharma',
    dateOfBirth: '2014-05-06',
    gender: 'Male',
    skillLevel: 'Beginner',
    phone: '9876543210',
    email: 'aarav@example.com',
    address: '12 MG Road',
    city: 'Pune',
    state: 'Maharashtra',
    pinCode: '411001',
    joinedOn: '2026-06-01',
    photoUrl: null,
    bloodGroup: 'B+',
    nationality: 'Indian',
    aadhaar: null,
    batchId: 'b1',
    coachId: 'c1',
    parentName: 'Ravi Sharma',
    parentRelation: 'Father',
    parentPhone: '9812345678',
    parentEmail: 'ravi@example.com',
  },
  enrollment: null,
  attendance: [],
  payments: [],
  documents: [],
  medical: null,
  attendanceTotal: 0,
  paymentTotal: 0,
  paymentAmount: 0,
  documentTotal: 0,
  attendanceSummary: { total: 10, present: 6, late: 2, absent: 2 },
} as unknown as StudentWorkspace;

function setup(id: string | null) {
  const getStudentWorkspace = vi.fn().mockResolvedValue(workspace);
  const detailPage = vi.fn().mockResolvedValue({ rows: [{ id: 't1', date: '2026-10-01' }], total: 1 });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'students', children: [] }]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
      },
      { provide: StudentListService, useValue: { getStudentWorkspace, detailPage } },
      { provide: AuthService, useValue: { hasPermission: () => true } },
    ],
  });
  const fixture = TestBed.createComponent(StudentDetailsPage);
  fixture.detectChanges();
  return { fixture, page: fixture.componentInstance, getStudentWorkspace, detailPage };
}

describe('StudentDetailsPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const { page } = setup('s1');
    expect(page).toBeTruthy();
  });

  it('returns to the student list when the route has no id', async () => {
    const { page } = setup(null);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await page.ngOnInit();
    expect(navigate).toHaveBeenCalledWith('/students');
  });

  it('loads the student workspace and the recent timeline', async () => {
    const { page, getStudentWorkspace, detailPage } = setup('s1');
    await page.ngOnInit();
    expect(getStudentWorkspace).toHaveBeenCalledWith('s1');
    expect(detailPage).toHaveBeenCalledWith('s1', 'timeline', 1, 5, {}, 'date', 'desc');
    expect(page['timeline']().length).toBe(1);
    expect(page['timelineTotal']()).toBe(1);
    expect(page['loading']()).toBe(false);
  });

  it('derives the attendance rate from the summary', async () => {
    const { page } = setup('s1');
    await page.ngOnInit();
    expect(page['attendanceSummary']().rate).toBe(80);
  });

  it('reports a load failure and stops the loading state', async () => {
    const { page, getStudentWorkspace } = setup('s1');
    getStudentWorkspace.mockRejectedValue(new Error('Student details could not be loaded.'));
    await page.ngOnInit();
    expect(page['error']()).toBe('Student details could not be loaded.');
    expect(page['loading']()).toBe(false);
  });

  it('loads the attendance history when the attendance tab is selected', async () => {
    const { fixture, page, detailPage } = setup('s1');
    await page.ngOnInit();
    detailPage.mockResolvedValue({ rows: [{ id: 'a1', attendance_date: '2026-10-01' }], total: 1 });
    page['setTab']('attendance');
    await fixture.whenStable();
    expect(detailPage).toHaveBeenLastCalledWith('s1', 'attendance', 1, 5, {}, 'attendance_date', 'desc');
    expect(page['data']()?.attendance).toHaveLength(1);
    expect(page['data']()?.attendanceTotal).toBe(1);
  });

  it('sorts the history table by the requested column', async () => {
    const { fixture, page, detailPage } = setup('s1');
    await page.ngOnInit();
    page['setTab']('timeline');
    await fixture.whenStable();
    page['sortTable']('paid_at');
    await fixture.whenStable();
    expect(detailPage).toHaveBeenLastCalledWith('s1', 'timeline', 1, 5, {}, 'paid_at', 'asc');
  });

  it('ignores a history response that arrives after a newer request', async () => {
    const { page, detailPage } = setup('s1');
    await page.ngOnInit();
    let resolveFirst!: (value: { rows: readonly unknown[]; total: number }) => void;
    const first = new Promise<{ rows: readonly unknown[]; total: number }>((resolve) => {
      resolveFirst = resolve;
    });
    detailPage.mockReturnValueOnce(first);
    const stale = page['changeHistoryPage']('timeline', 1);
    const latest = page['changeHistoryPage']('timeline', 1);
    await latest;
    resolveFirst({ rows: [{ id: 'stale' }], total: 1 });
    await stale;
    expect(page['timeline']()[0]?.id).not.toBe('stale');
  });
});
