import { ServerListService } from '../../core/supabase/server-list.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { EnrollmentsService } from '../../core/supabase/domain-services';
import { EnrollmentWorkspace } from '../../core/supabase/enrollment.models';
import { EnrollmentsPage } from './enrollments-page';

const workspace: EnrollmentWorkspace = {
  students: [
    {
      id: 's1',
      student_code: 'STU-12345',
      full_name: 'Asha Player',
      date_of_birth: '2014-02-01',
      phone: '9999999999',
      status: 'active',
    },
  ],
  batches: [
    { id: 'b1', code: 'B1', name: 'Morning', capacity: 10, status: 'active', fee_plan_id: 'p1' },
    { id: 'b2', code: 'B2', name: 'Evening', capacity: 10, status: 'active', fee_plan_id: 'p1' },
  ],
  plans: [
    { id: 'p1', name: 'Training plan', monthly_fee: 1234.5, duration_months: 3, status: 'active' },
  ],
  enrollments: [
    {
      id: 'e1',
      student_id: 's1',
      batch_id: 'b1',
      fee_plan_id: 'p1',
      monthly_fee: 1234.5,
      valid_from: '2026-09-01',
      valid_till: null,
      notes: 'Original notes',
      status: 'active',
    },
  ],
};
async function setup(view = 'list') {
  const api = {
    workspace: vi.fn().mockResolvedValue(structuredClone(workspace)),
    create: vi.fn().mockResolvedValue({}),
    changeStatus: vi.fn().mockResolvedValue({}),
    transfer: vi.fn().mockResolvedValue({}),
    historyPage: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    exportHistory: vi.fn().mockResolvedValue([]),
  };
  const lists = { page: vi.fn().mockResolvedValue({rows:workspace.enrollments.map(row=>({...row,student:workspace.students[0],batch:workspace.batches[0],plan:workspace.plans[0]})),total:1,page:1,metrics:{total:1,active:1,paused:0,cancelled:0,expiring:0},options:{batches:workspace.batches}}) };
  TestBed.configureTestingModule({
    imports: [EnrollmentsPage],
    providers: [provideRouter([]), { provide: EnrollmentsService, useValue: api }, { provide: ServerListService, useValue: lists }],
  });
  TestBed.inject(ActivatedRoute).snapshot.data = { enrollmentView: view };
  TestBed.inject(ActivatedRoute).snapshot.queryParams = { enrollment: 'e1' };
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(EnrollmentsPage);
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
  return { component: fixture.componentInstance, fixture, api, lists, navigate };
}
describe('Enrollment workflows', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('shows the enrollment selected by the action link after options load', async () => {
    const { fixture } = await setup('transfer');
    expect(fixture.nativeElement.querySelector('form select').value).toBe('e1');
  });
  it('loads real enrollment names, codes, plan amounts and dates', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.textContent).toContain('Asha Player');
    expect(fixture.nativeElement.textContent).toContain('STU-12345');
    expect(fixture.nativeElement.textContent).toContain('Training plan');
    expect(fixture.nativeElement.textContent).not.toContain('Quarterly Plan');
  });
  it('awaits creation, blocks duplicate submissions and preserves inputs on failure', async () => {
    const { component, api, navigate } = await setup('new');
    component['form'].setValue({
      studentId: 's1',
      batchId: 'b1',
      feePlanId: 'p1',
      startDate: '2026-09-23',
      dueDate: '2026-12-23',
      notes: 'Saved note',
    });
    let reject!: (error: Error) => void;
    api.create.mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    const pending = component['submit']();
    await component['submit']();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(component['message']()).toBe('');
    reject(new Error('Unable to save enrollment'));
    await pending;
    expect(component['error']()).toContain('Unable to save');
    expect(component['form'].controls.notes.value).toBe('Saved note');
    expect(component['saving']()).toBe(false);
    await component['submit']();
    expect(api.create).toHaveBeenLastCalledWith(
      's1',
      'b1',
      'p1',
      '2026-09-23',
      '2026-12-23',
      'Saved note',
    );
    expect(navigate).toHaveBeenCalledWith(['/enrollments'], {
      state: { message: 'Enrollment created successfully.' },
    });
  });
  it('rejects an end date before the start date', async () => {
    const { component, api } = await setup('new');
    component['form'].patchValue({
      studentId: 's1',
      batchId: 'b1',
      feePlanId: 'p1',
      startDate: '2026-09-23',
      dueDate: '2026-09-01',
    });
    await component['submit']();
    expect(api.create).not.toHaveBeenCalled();
  });
  for (const view of ['pause', 'cancel', 'transfer']) {
    it(`persists ${view} with its reason and leaves the form open on failure`, async () => {
      const { component, api, navigate } = await setup(view);
      component['actionForm'].setValue({ batchId: 'b2', reason: 'School timetable changed' });
      const write = view === 'transfer' ? api.transfer : api.changeStatus;
      write.mockRejectedValueOnce(new Error('Permission denied'));
      await component['applyAction']();
      expect(navigate).not.toHaveBeenCalled();
      expect(component['message']()).toBe('');
      expect(component['error']()).toBe('Permission denied');
      await component['applyAction']();
      if (view === 'transfer')
        expect(write).toHaveBeenLastCalledWith(
          'e1',
          'b2',
          expect.any(String),
          'School timetable changed',
        );
      else
        expect(write).toHaveBeenLastCalledWith(
          'e1',
          view === 'pause' ? 'paused' : 'cancelled',
          'School timetable changed',
        );
      expect(navigate).toHaveBeenCalledTimes(1);
    });
  }
  it('never selects the first enrollment implicitly', async () => {
    const { component, api } = await setup('pause');
    component['selectedId'].set('');
    component['actionForm'].controls.reason.setValue('Vacation');
    await component['applyAction']();
    expect(api.changeStatus).not.toHaveBeenCalled();
  });
  it('refreshes after reactivation and reports rejected writes', async () => {
    const { component, api, lists } = await setup();
    api.changeStatus.mockRejectedValueOnce(new Error('Batch full'));
    await component['reactivate']('e1');
    expect(component['message']()).toBe('');
    expect(component['error']()).toBe('Batch full');
    await component['reactivate']('e1');
    expect(lists.page).toHaveBeenCalledTimes(2);
  });
  it('keeps the latest history filter result when requests finish out of order', async () => {
    const { component, api } = await setup('history');
    let finish!: (value: { rows: never[]; total: number }) => void;
    api.historyPage
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce({ rows: [], total: 2 });
    component['historyForm'].controls.search.setValue('Old search');
    const old = component['applyHistoryFilters']();
    component['historyForm'].controls.search.setValue('New search');
    await component['applyHistoryFilters']();
    finish({ rows: [], total: 99 });
    await old;
    expect(component['historyTotal']()).toBe(2);
    expect(component['historyLoading']()).toBe(false);
  });
  it('resets the history page and reloads with the selected row count', async () => {
    const { component, fixture, api } = await setup('history');
    component['page'].set(3);
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select[aria-label="Rows per page"]');
    expect(select.value).toBe('5');
    select.value = '20';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(api.historyPage).toHaveBeenLastCalledWith(expect.any(Object), 1, 20);
    expect(component['page']()).toBe(1);
  });
});
