import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  EnrollmentsService,
  FeesService,
  PaymentsService,
} from '../../core/supabase/domain-services';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { ToastService } from '../../shared/toast/toast.service';
import { FeesPage } from './fees-page';

async function setupWrites() {
  const fees = {
    chargePage: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    chargeSummary: vi.fn().mockResolvedValue({ students: 0, total: 0, pending: 0, overdue: 0 }),
    batchOptions: vi.fn().mockResolvedValue([]),
    createCharge: vi.fn().mockResolvedValue({ id: 'charge' }),
    statement: vi.fn(),
  };
  const payments = {
    record: vi.fn().mockResolvedValue({ receipt: { receipt_number: 'RCP-123' } }),
  };
  const enrollments = {
    workspace: vi
      .fn()
      .mockResolvedValue({
        students: [{ id: 's1', full_name: 'Asha' }],
        batches: [{ id: 'b1', name: 'Morning' }],
        plans: [],
        enrollments: [
          { id: 'e1', student_id: 's1', batch_id: 'b1', status: 'active', monthly_fee: 1234.56 },
        ],
      }),
  };
  const printDocuments = {
    printInvoice: vi.fn().mockResolvedValue(undefined),
    printStatement: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    imports: [FeesPage],
    providers: [
      provideRouter([]),
      { provide: FeesService, useValue: fees },
      { provide: PaymentsService, useValue: payments },
      { provide: EnrollmentsService, useValue: enrollments },
      { provide: PrintDocumentService, useValue: printDocuments },
    ],
  });
  const fixture = TestBed.createComponent(FeesPage);
  const toast = vi.spyOn(TestBed.inject(ToastService), 'error').mockImplementation(() => undefined);
  return { component: fixture.componentInstance, fixture, fees, payments, enrollments, printDocuments, toast };
}

describe('Monthly charge writes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });
  for (const kind of ['payment', 'charge']) {
    it(`focuses the ${kind} dialog and dismisses it with Escape only when idle`, async () => {
      const { component, fixture } = await setupWrites();
      fixture.detectChanges();
      await fixture.whenStable();
      if (kind === 'payment') component['selectCharge']('c1', 123456);
      else await component['openChargeDialog']();
      fixture.detectChanges();
      await fixture.whenStable();
      const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
      expect(dialog.contains(document.activeElement)).toBe(true);
      component['submitting'].set(true);
      fixture.detectChanges();
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
      component['submitting'].set(false);
      fixture.detectChanges();
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    });
  }
  it('awaits payment, prevents duplicate clicks and retries with the same reference', async () => {
    const { component, fees, payments, toast } = await setupWrites();
    component['selectCharge']('c1', 123456);
    let reject!: (error: Error) => void;
    payments.record.mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    const pending = component['submitPayment']();
    await component['submitPayment']();
    expect(payments.record).toHaveBeenCalledTimes(1);
    expect(component['message']()).toBe('');
    expect(component['selectedChargeId']()).toBe('c1');
    const reference = payments.record.mock.calls[0]![3];
    reject(new Error('Connection lost'));
    await pending;
    expect(toast).toHaveBeenCalledWith('Connection lost');
    expect(component['selectedChargeId']()).toBe('c1');
    await component['submitPayment']();
    expect(payments.record).toHaveBeenLastCalledWith('c1', 1234.56, 'upi', reference);
    expect(component['selectedChargeId']()).toBe('');
    expect(component['receiptNumber']()).toBe('RCP-123');
    expect(fees.chargeSummary).toHaveBeenCalledTimes(1);
  });
  it('loads actual enrollments and preserves a rejected charge for correction', async () => {
    const { component, fees, toast } = await setupWrites();
    await component['openChargeDialog']();
    component['enrollmentChanged']('e1');
    expect(component['chargeForm'].controls.amountRupees.value).toBe(1234.56);
    component['chargeForm'].patchValue({
      enrollmentId: 'e1',
      period: '2026-09',
      dueDate: '2026-09-25',
    });
    fees.createCharge.mockRejectedValueOnce(new Error('Duplicate charge'));
    await component['addCharge']();
    expect(component['chargeDialogOpen']()).toBe(true);
    expect(component['message']()).toBe('');
    expect(toast).toHaveBeenCalledWith('Duplicate charge');
    expect(fees.chargePage).not.toHaveBeenCalled();
    await component['addCharge']();
    expect(fees.createCharge).toHaveBeenLastCalledWith('e1', '2026-09', '2026-09-25', 1234.56);
    expect(component['chargeDialogOpen']()).toBe(false);
    expect(fees.chargeSummary).toHaveBeenCalledTimes(1);
  });
  it('rejects payments above the selected outstanding balance', async () => {
    const { component, payments } = await setupWrites();
    component['selectCharge']('c1', 10000);
    component['paymentForm'].controls.amountRupees.setValue(100.01);
    await component['submitPayment']();
    expect(payments.record).not.toHaveBeenCalled();
    expect(component['paymentForm'].controls.amountRupees.hasError('max')).toBe(true);
  });
  it('does not accept the old free-text month format or a zero payment', async () => {
    const { component, fees, payments } = await setupWrites();
    component['chargeForm'].setValue({
      enrollmentId: 'e1',
      period: 'Sep 2026',
      dueDate: '2026-09-25',
      amountRupees: 100,
    });
    await component['addCharge']();
    expect(fees.createCharge).not.toHaveBeenCalled();
    component['selectCharge']('c1', 0);
    await component['submitPayment']();
    expect(payments.record).not.toHaveBeenCalled();
  });
  it('starts the fee statement at the financial year and prints the real ledger payload', async () => {
    const { component, fixture, fees, printDocuments } = await setupWrites();
    const preferences = TestBed.inject(AcademyPreferencesService);
    vi.spyOn(preferences, 'today').mockReturnValue('2026-11-02');
    fees.statement.mockResolvedValue({
      statementNumber: 'FES-TCA1-20260401-20261102',
      fromDate: '2026-04-01',
      toDate: '2026-11-02',
      studentName: 'Asha',
      studentCode: 'TCA-1',
      batchName: 'Morning',
      openingBalance: 0,
      closingBalance: 250,
      totalCharges: 250,
      totalPayments: 0,
      totalRefunds: 0,
      lines: [
        {
          date: '2026-04-05',
          type: 'charge',
          description: 'Monthly fee — April 2026 · Morning',
          reference: 'INV-C1',
          debit: 250,
          credit: 0,
          balance: 250,
        },
      ],
      ageing: [{ label: 'Not due', amount: 250 }],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    component['openStatementDialog']({
      id: 'c1',
      studentId: 's1',
      enrollmentId: 'e1',
      studentName: 'Asha',
      batchId: 'b1',
      batchName: 'Morning',
      planName: 'Monthly',
      period: '2026-04',
      amountPaise: 25000,
      paidPaise: 0,
      balancePaise: 25000,
      dueDate: '2026-04-05',
      status: 'Pending',
    });
    fixture.detectChanges();
    expect(component['statementDialogOpen']()).toBe(true);
    expect(component['statementForm'].getRawValue()).toEqual({
      fromDate: '2026-04-01',
      toDate: '2026-11-02',
    });
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();

    await component['printStatement']('print');

    expect(fees.statement).toHaveBeenCalledWith('s1', '2026-04-01', '2026-11-02', 'Asia/Kolkata');
    expect(printDocuments.printStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        statementNumber: 'FES-TCA1-20260401-20261102',
        studentName: 'Asha',
        closingBalance: 250,
        lines: [expect.objectContaining({ reference: 'INV-C1' })],
      }),
      'print',
    );
    expect(component['statementDialogOpen']()).toBe(false);
  });
  it('blocks a reversed statement period and sends Download PDF through the same document', async () => {
    const { component, fees, printDocuments } = await setupWrites();
    component['statementStudent'].set({
      id: 'c1',
      studentId: 's1',
      enrollmentId: 'e1',
      studentName: 'Asha',
      batchId: 'b1',
      batchName: 'Morning',
      planName: 'Monthly',
      period: '2026-04',
      amountPaise: 25000,
      paidPaise: 0,
      balancePaise: 25000,
      dueDate: '2026-04-05',
      status: 'Pending',
    });
    component['statementForm'].setValue({ fromDate: '2026-05-01', toDate: '2026-04-01' });
    await component['printStatement']('print');
    expect(fees.statement).not.toHaveBeenCalled();

    component['statementForm'].setValue({ fromDate: '2026-04-01', toDate: '2026-11-02' });
    fees.statement.mockResolvedValue({
      statementNumber: 'FES-TCA1-20260401-20261102',
      fromDate: '2026-04-01',
      toDate: '2026-11-02',
      studentName: 'Asha',
      studentCode: 'TCA-1',
      openingBalance: 0,
      closingBalance: 0,
      totalCharges: 0,
      totalPayments: 0,
      totalRefunds: 0,
      lines: [],
      ageing: [],
    });
    await component['printStatement']('pdf');
    expect(printDocuments.printStatement).toHaveBeenCalledWith(
      expect.objectContaining({ statementNumber: 'FES-TCA1-20260401-20261102' }),
      'pdf',
    );
  });
});

describe('Monthly charge totals', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('keeps collection totals stable when filtering and changing pages', async () => {
    const fees = {
      chargePage: vi.fn().mockResolvedValue({ rows: [], total: 17 }),
      chargeSummary: vi.fn().mockResolvedValue({
        students: 17,
        total: 12500,
        pending: 3500,
        overdue: 1500,
      }),
      batchOptions: vi.fn().mockResolvedValue([]),
    };
    TestBed.configureTestingModule({
      imports: [FeesPage],
      providers: [
        provideRouter([]),
        { provide: FeesService, useValue: fees },
        { provide: EnrollmentsService, useValue: {} },
        { provide: PaymentsService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(FeesPage);
    const settle = async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    fixture.detectChanges();
    await settle();
    const amounts = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.metrics strong') as NodeListOf<HTMLElement>,
      ).map((element) => element.textContent?.trim());
    const expectedAmounts = ['17', '₹12,500.00', '₹3,500.00', '₹1,500.00', '₹0.00', '₹0.00', '₹0.00'];
    expect(amounts()).toEqual(expectedAmounts);

    const status: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[aria-label="Filter status"]',
    );
    for (const value of ['pending', '']) {
      status.value = value;
      status.dispatchEvent(new Event('input'));
      await new Promise(resolve=>setTimeout(resolve,300));
      await settle();
      expect(fees.chargePage).toHaveBeenLastCalledWith(1, 5, {
        search: '',
        batchId: 'all',
        status: 'all',
        columns: { cf_status: value },
        sortBy: 'dueDate',
        sortDirection: 'desc',
      });
      expect(amounts()).toEqual(expectedAmounts);
    }

    const next: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Next page"]',
    );
    next.click();
    await settle();
    expect(fees.chargePage).toHaveBeenLastCalledWith(2, 5, {
      search: '',
      batchId: 'all',
      status: 'all',
      columns: { cf_status: '' },
      sortBy: 'dueDate',
      sortDirection: 'desc',
    });
    expect(amounts()).toEqual(expectedAmounts);
    expect(fees.chargeSummary).toHaveBeenCalledTimes(1);
    const size: HTMLSelectElement = fixture.nativeElement.querySelector('select[aria-label="Rows per page"]');
    expect(size.value).toBe('5');
    size.value = '20';
    size.dispatchEvent(new Event('change'));
    await settle();
    expect(fees.chargePage).toHaveBeenLastCalledWith(1, 20, {
      columns: {cf_status: ''}, search: '', batchId: 'all', status: 'all', sortBy: 'dueDate', sortDirection: 'desc',
    });
    expect(amounts()).toEqual(expectedAmounts);
  });
});
