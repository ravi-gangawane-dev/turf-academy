import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { PaymentsPage } from './payments-page';
import { ToastService } from '../../shared/toast/toast.service';
import { FeesService, PaymentsService } from '../../core/supabase/domain-services';
import { StorageService } from '../../core/supabase/storage.service';
import { PrintDocumentService } from '../../shared/print/print-document.service';
async function setup() {
  const api = {
    record: vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({}),
    refund: vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({}),
    refundReceipts: vi.fn().mockResolvedValue([
      {
        id: 'refund-1',
        paymentId: 'payment',
        refundReceiptNumber: 'RFR-R1-A1B2C3',
        originalReceiptNumber: 'R1',
        studentName: 'Asha',
        studentCode: 'S1',
        refundAmount: 25.25,
        originalAmount: 100.5,
        paymentMode: 'Cash',
        refundedAt: '2026-09-25T10:00:00Z',
        paidAt: '2026-09-24T10:00:00Z',
        reason: 'Session cancelled',
        reference: 'REF-1',
        approvedBy: 'Academy Admin',
        batchName: 'Morning Elite',
        period: 'September 2026',
      },
    ]),
    ledgerPage: vi
      .fn()
      .mockResolvedValue({
        rows: [],
        total: 35,
        metrics: { total: 1234.56, refunded: 25.25, transactions: 35, receipts: 35 },
      }),
  };
  TestBed.configureTestingModule({
    imports: [PaymentsPage],
    providers: [
      ToastService,
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { data: { paymentView: 'partial' }, queryParamMap: new Map() }, queryParamMap: { subscribe: (callback: (params: URLSearchParams) => void) => { callback(new URLSearchParams()); return { unsubscribe() {} }; } } },
      },
      { provide: PaymentsService, useValue: api },
      { provide: FeesService, useValue: { charges: async () => [] } },
      { provide: StorageService, useValue: {} },
    ],
  });
  return { page: TestBed.createComponent(PaymentsPage).componentInstance, api };
}
describe('Payment workflows', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('closes the URL-driven payment form only after a successful retry', async () => {
    const { page, api } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page['view'] = 'new';
    const value = { chargeId: 'charge', amount: 500, mode: 'cash', providerReference: '' };
    await page['submitDialog'](value);
    expect(page['view']).toBe('new');
    expect(navigate).not.toHaveBeenCalled();
    await page['submitDialog'](value);
    expect(page['view']).toBe('list');
    expect(navigate).toHaveBeenCalledWith(['/payments']);
    expect(api.record.mock.calls[0][3]).toBe(api.record.mock.calls[1][3]);
  });

  it('retains entered payments and their reference across failed retries', async () => {
    const { page, api } = await setup();
    page['form'].patchValue({ chargeId: 'charge', amountRupees: 12.34, mode: 'cash' });
    await page['submit']();
    expect(page['form'].controls.amountRupees.value).toBe(12.34);
    const toast = vi.spyOn(TestBed.inject(ToastService), 'success').mockImplementation(() => undefined);
    expect(toast).not.toHaveBeenCalled();
    await page['submit']();
    expect(api.record.mock.calls[0][3]).toBe(api.record.mock.calls[1][3]);
    expect(page['form'].controls.chargeId.value).toBe('');
  });
  it('limits a second refund to the remaining refundable amount and retains its retry key', async () => {
    const { page, api } = await setup();
    page['openRefund']({
      id: 'payment',
      studentId: 'student',
      studentName: 'Asha',
      studentCode: 'S1',
      amountPaise: 10050,
      refundablePaise: 7525,
      mode: 'cash',
      status: 'partially_refunded',
      paidAt: '2026-09-24',
      receiptId: 'receipt',
      receiptNumber: 'R1',
      receiptPath: '',
      reference: 'REF-1',
      chargeId: 'charge',
    });
    expect(page['refundForm'].controls.amountRupees.value).toBe(75.25);
    page['refundForm'].patchValue({ amountRupees: 100.5, reason: 'Refund requested' });
    await page['submitRefund']();
    expect(api.refund).not.toHaveBeenCalled();
    page['refundForm'].controls.amountRupees.setValue(25.25);
    await page['submitRefund']();
    expect(page['refundPayment']()?.id).toBe('payment');
    await page['submitRefund']();
    expect(api.refund.mock.calls[0][3]).toBe(api.refund.mock.calls[1][3]);
    expect(page['refundPayment']()).toBeNull();
  });
  it('uses settlement filters and whole-result totals from the server on every page', async () => {
    const { page, api } = await setup();
    await page.ngOnInit();
    expect(api.ledgerPage).toHaveBeenLastCalledWith('partial', 1, 5, undefined, {
      columns: {},
      search: '',
      status: 'all',
      sortBy: 'date',
      sortDirection: 'desc',
    });
    page['page'].set(2);
    await page['reload']();
    expect(page['metrics']()).toEqual({
      total: 123456,
      refunded: 2525,
      transactions: 35,
      receipts: 35,
    });
    expect(page['total']()).toBe(35);
    page['setPageSize'](20);
    expect(api.ledgerPage).toHaveBeenLastCalledWith('partial', 1, 20, undefined, {
      columns: {},
      search: '',
      status: 'all',
      sortBy: 'date',
      sortDirection: 'desc',
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  it('loads the refunds for a payment and prints the selected refund receipt', async () => {
    const { page, api } = await setup();
    await page['openRefundReceipt']({
      id: 'payment',
      studentId: 'student',
      studentName: 'Asha',
      studentCode: 'S1',
      amountPaise: 10050,
      refundablePaise: 0,
      mode: 'cash',
      status: 'refunded',
      paidAt: '2026-09-24',
      receiptId: 'receipt',
      receiptNumber: 'R1',
      receiptPath: '',
      reference: 'REF-1',
      chargeId: 'charge',
    });
    expect(api.refundReceipts).toHaveBeenCalledWith('payment');
    expect(page['refundReceiptRows']()).toHaveLength(1);

    const printDocuments = TestBed.inject(PrintDocumentService);
    const print = vi.spyOn(printDocuments, 'printRefundReceipt').mockResolvedValue(undefined);
    await page['printRefundReceipt'](page['refundReceipts']()[0], 'pdf');

    expect(print).toHaveBeenCalledWith(
      expect.objectContaining({
        refundReceiptNumber: 'RFR-R1-A1B2C3',
        originalReceiptNumber: 'R1',
        refundAmount: 25.25,
        originalAmount: 100.5,
        approvedBy: 'Academy Admin',
        reference: 'REF-1',
      }),
      'pdf',
    );
    print.mockRestore();
  });
});
