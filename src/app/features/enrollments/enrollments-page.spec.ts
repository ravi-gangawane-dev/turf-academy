import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { EnrollmentsService } from '../../core/supabase/domain-services';
import { EnrollmentConfirmationRecord, EnrollmentWorkspace } from '../../core/supabase/enrollment.models';
import { ServerListService } from '../../core/supabase/server-list.service';
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { ToastService } from '../../shared/toast/toast.service';
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

const confirmationRecord: EnrollmentConfirmationRecord = {
  enrollment: workspace.enrollments[0],
  student: workspace.students[0],
  batch: {
    id: 'b1',
    code: 'B1',
    name: 'Morning',
    age_group: 'Under 14',
    skill_level: 'Beginner',
    start_date: '2026-09-01',
    end_date: '2027-03-31',
    start_time: '06:30:00',
    end_time: '08:00:00',
    status: 'active',
    capacity: 10,
    batch_days: [{ day_of_week: 1 }, { day_of_week: 3 }],
    batch_coaches: [{ coach: { full_name: 'Coach Rao' } }],
  },
  plan: {
    id: 'p1',
    name: 'Training plan',
    monthly_fee: 1234.5,
    registration_fee: 500,
    duration_months: 3,
    status: 'active',
  },
  guardians: [
    {
      id: 'g1',
      full_name: 'Ravi Patil',
      relation: 'Father',
      phone: '9999999999',
      whatsapp: null,
      email: null,
      is_primary: true,
      can_pick_up: true,
    },
  ],
  previousBatch: null,
};

async function setup(view = 'list') {
  const api = {
    workspace: vi.fn().mockResolvedValue(structuredClone(workspace)),
    create: vi.fn().mockResolvedValue({}),
    changeStatus: vi.fn().mockResolvedValue({}),
    transfer: vi.fn().mockResolvedValue({}),
    historyPage: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    exportHistory: vi.fn().mockResolvedValue([]),
    confirmation: vi.fn().mockResolvedValue(structuredClone(confirmationRecord)),
  };
  const lists = { page: vi.fn().mockResolvedValue({ rows: workspace.enrollments.map(row => ({ ...row, student: workspace.students[0], batch: workspace.batches[0], plan: workspace.plans[0] })), total: 1, page: 1, metrics: { total: 1, active: 1, paused: 0, cancelled: 0, expiring: 0 }, options: { batches: workspace.batches } }) };
  const printEnrollmentConfirmation = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    imports: [EnrollmentsPage],
    providers: [provideRouter([]), { provide: EnrollmentsService, useValue: api }, { provide: ServerListService, useValue: lists }, { provide: PrintDocumentService, useValue: { printEnrollmentConfirmation } }, { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } }],
  });
  TestBed.inject(ActivatedRoute).snapshot.data = { enrollmentView: view };
  TestBed.inject(ActivatedRoute).snapshot.queryParams = { enrollment: 'e1' };
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(EnrollmentsPage);
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
  return { component: fixture.componentInstance, fixture, api, lists, navigate, printEnrollmentConfirmation };
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
      () => new Promise((_, fail) => {
        reject = fail;
      }),
    );
    const pending = component['submit']();
    await component['submit']();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    reject(new Error('Unable to save enrollment'));
    await pending;
    const toast = vi.spyOn(TestBed.inject(ToastService), 'error');
    expect(toast).toHaveBeenCalledWith('Unable to save enrollment');
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
    expect(navigate).toHaveBeenCalledWith(['/enrollments']);
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
      const toast = vi.spyOn(TestBed.inject(ToastService), 'error');
      expect(toast).toHaveBeenCalledWith('Permission denied');
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
    const toast = vi.spyOn(TestBed.inject(ToastService), 'error');
    expect(toast).toHaveBeenCalledWith('Batch full');
    await component['reactivate']('e1');
    expect(lists.page).toHaveBeenCalledTimes(2);
  });
  it('keeps the latest history filter result when requests finish out of order', async () => {
    const { component, api } = await setup('history');
    let finish!: (value: { rows: never[]; total: number }) => void;
    api.historyPage
      .mockImplementationOnce(
        () => new Promise((resolve) => {
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

describe('Enrollment confirmation', () => {
  afterEach(() => TestBed.resetTestingModule());

  async function createdEnrollment() {
    const context = await setup('new');
    context.api.create.mockResolvedValueOnce({ id: 'e1' });
    context.component['form'].setValue({
      studentId: 's1',
      batchId: 'b1',
      feePlanId: 'p1',
      startDate: '2026-09-01',
      dueDate: '',
      notes: 'Saved note',
    });
    await context.component['submit']();
    await new Promise((resolve) => setTimeout(resolve, 0));
    context.fixture.detectChanges();
    return context;
  }

  it('loads the saved enrollment and offers preview, download and print before leaving', async () => {
    const { component, fixture, api, navigate, printEnrollmentConfirmation } = await createdEnrollment();

    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.confirmation).toHaveBeenCalledWith('e1');
    expect(component['confirmationOpen']()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.enrollment-confirm-dialog')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Enrollment confirmation');
    expect(fixture.nativeElement.textContent).toContain('Asha Player · STU-12345');
    expect(fixture.nativeElement.textContent).toContain('Morning · B1');
    expect(fixture.nativeElement.textContent).toContain('Training plan');

    await component['prepareConfirmation']('preview');

    expect(navigate).toHaveBeenCalledWith(['/enrollments']);
    expect(printEnrollmentConfirmation).toHaveBeenCalledTimes(1);
    const [input, destination] = printEnrollmentConfirmation.mock.calls[0] as [
      Record<string, unknown>,
      string,
    ];
    expect(destination).toBe('preview');
    expect(input).toMatchObject({
      action: 'created',
      studentName: 'Asha Player',
      studentCode: 'STU-12345',
      studentDateOfBirth: '2014-02-01',
      guardianName: 'Ravi Patil',
      guardianPhone: '9999999999',
      guardianRelation: 'Father',
      batchName: 'Morning',
      batchCode: 'B1',
      batchSchedule: 'Mon, Wed',
      batchTime: '06:30 – 08:00',
      batchCoaches: ['Coach Rao'],
      planName: 'Training plan',
      monthlyFee: 1234.5,
      registrationFee: 500,
      durationMonths: 3,
      validFrom: '2026-09-01',
      status: 'active',
      effectiveOn: '2026-09-01',
    });
    expect(input['terms']).toEqual(
      expect.arrayContaining([
        { label: 'Enrollment status', value: 'active' },
        { label: 'Batch schedule', value: 'Mon, Wed' },
        { label: 'Session time', value: '06:30 – 08:00' },
        { label: 'Fee plan', value: 'Training plan' },
        { label: 'Enrollment notes', value: 'Original notes' },
      ]),
    );
  });

  it('captures the transfer action, previous batch and reason from live records', async () => {
    const { component, fixture, api, navigate, printEnrollmentConfirmation } = await setup('transfer');
    api.transfer.mockResolvedValueOnce({ id: 'e1' });
    api.confirmation.mockResolvedValueOnce({
      ...structuredClone(confirmationRecord),
      previousBatch: { name: 'Evening', code: 'B2' },
    });
    component['actionForm'].setValue({ batchId: 'b2', reason: 'School timetable changed' });

    await component['applyAction']();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(component['confirmationAction']()).toBe('transferred');
    expect(component['confirmationOpen']()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();

    await component['prepareConfirmation']('pdf');

    const [input, destination] = printEnrollmentConfirmation.mock.calls[0] as [
      Record<string, unknown>,
      string,
    ];
    expect(destination).toBe('pdf');
    expect(input).toMatchObject({
      action: 'transferred',
      previousBatchName: 'Evening',
      previousBatchCode: 'B2',
      reason: 'School timetable changed',
    });
    expect(input['terms']).toEqual(
      expect.arrayContaining([
        { label: 'Previous batch', value: 'Evening (B2)' },
        { label: 'Transfer reason', value: 'School timetable changed' },
      ]),
    );
    expect(navigate).toHaveBeenCalledWith(['/enrollments']);
  });

  it('prints a cancellation with its recorded reason', async () => {
    const { component, api, printEnrollmentConfirmation } = await setup('cancel');
    api.changeStatus.mockResolvedValueOnce({ id: 'e1' });
    component['actionForm'].setValue({ batchId: '', reason: 'Family relocated' });

    await component['applyAction']();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component['confirmationAction']()).toBe('cancelled');
    await component['prepareConfirmation']('print');

    const [input, destination] = printEnrollmentConfirmation.mock.calls[0] as [
      Record<string, unknown>,
      string,
    ];
    expect(destination).toBe('print');
    expect(input).toMatchObject({ action: 'cancelled', status: 'active', reason: 'Family relocated' });
    expect(input['terms']).toEqual(
      expect.arrayContaining([{ label: 'Change reason', value: 'Family relocated' }]),
    );
  });

  it('shows a load failure in the dialog and retries the live read', async () => {
    const { component, fixture, api } = await setup('new');
    api.create.mockResolvedValueOnce({ id: 'e1' });
    api.confirmation.mockRejectedValueOnce(new Error('Enrollment unavailable'));
    component['form'].setValue({
      studentId: 's1',
      batchId: 'b1',
      feePlanId: 'p1',
      startDate: '2026-09-01',
      dueDate: '',
      notes: '',
    });
    await component['submit']();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(component['confirmationError']()).toBe('Enrollment unavailable');
    expect(component['confirmationOpen']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Try again');

    api.confirmation.mockResolvedValueOnce(structuredClone(confirmationRecord));
    component['retryConfirmation']();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(component['confirmationError']()).toBe('');
    expect(component['confirmation']()).not.toBeNull();
  });

  it('closes without printing and returns to the enrollment list', async () => {
    const { component, navigate, printEnrollmentConfirmation } = await createdEnrollment();

    component['closeConfirmation']();

    expect(component['confirmationOpen']()).toBe(false);
    expect(component['confirmation']()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/enrollments']);
    expect(printEnrollmentConfirmation).not.toHaveBeenCalled();
  });
});