import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { PaymentsPage } from './payments-page';
import { FeesService, PaymentsService } from '../../core/supabase/domain-services';
import { StorageService } from '../../core/supabase/storage.service';
async function setup() {
  const api = {
    record: vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({}),
    refund: vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({}),
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
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { data: { paymentView: 'partial' }, queryParamMap: new Map() } },
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
  it('retains entered payments and their reference across failed retries', async () => {
    const { page, api } = await setup();
    page['form'].patchValue({ chargeId: 'charge', amountRupees: 12.34, mode: 'cash' });
    await page['submit']();
    expect(page['form'].controls.amountRupees.value).toBe(12.34);
    expect(page['message']()).toBe('');
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
});
