import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';
import { DatabaseService } from './database.service';
import { EnrollmentsService, FeesService, PaymentsService } from './domain-services';

function response(body: unknown, status = 200, count?: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(count === undefined ? {} : { 'Content-Range': `0-499/${count}` }),
    },
  });
}
function setup(fetch: typeof globalThis.fetch) {
  const client = createClient('https://unit-test.supabase.co', 'unit-test-key', {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  TestBed.configureTestingModule({
    providers: [{ provide: DatabaseService, useValue: { client } }],
  });
}
describe('Enrollment and financial services', () => {
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });
  it('loads actual fee plan names with a stable charge page order', async () => {
    setup(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/monthly_charge_balances')) {
        expect(url.searchParams.get('order')).toBe('due_date.desc,id.asc');
        return response([{ id: 'c1', enrollment_id: 'e1' }], 200, 1);
      }
      expect(url.searchParams.get('select')).toContain('plan:fee_plans(name)');
      return response([{ id: 'e1', batch_id: 'b1', batch: { name: 'Morning' }, plan: { name: 'Monthly cricket' } }]);
    });
    const result = await TestBed.inject(FeesService).chargePage(1, 10);
    expect(result.rows[0]?.plan_name).toBe('Monthly cricket');
    expect(result.rows[0]?.batch_name).toBe('Morning');
  });
  it('loads reference data beyond the first server page', async () => {
    setup(async (input) => {
      const url = new URL(String(input));
      if (!url.pathname.endsWith('/students')) return response([]);
      return response(
        url.searchParams.get('offset') === '500'
          ? [{ id: 'last-student' }]
          : Array.from({ length: 500 }, (_, i) => ({ id: String(i) })),
      );
    });
    const result = await TestBed.inject(EnrollmentsService).workspace();
    expect(result.students).toHaveLength(501);
    expect(result.students[500]?.id).toBe('last-student');
  });
  it('exports every matching history page rather than only the visible page', async () => {
    setup(async (input) => {
      const url = new URL(String(input));
      expect(url.searchParams.get('enrollment.student_id')).toBe('eq.student-1');
      return response(
        url.searchParams.get('offset') === '500'
          ? [{ id: 'last-event' }]
          : Array.from({ length: 500 }, (_, i) => ({ id: String(i) })),
        200,
        501,
      );
    });
    const rows = await TestBed.inject(EnrollmentsService).exportHistory({
      search: '',
      studentId: 'student-1',
      action: '',
      batchId: '',
      from: '',
      to: '',
    });
    expect(rows).toHaveLength(501);
    expect(rows[500]?.id).toBe('last-event');
  });
  it('uses the enrollment student for charges and preserves decimal amounts', async () => {
    const requests: { path: string; body: unknown }[] = [];
    setup(async (input, options) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/enrollments'))
        return response({
          student_id: 'correct-student',
          status: 'active',
          valid_from: '2026-09-01',
          valid_till: null,
        });
      if (url.pathname.endsWith('/monthly_charges') && !options?.body)
        return response([]);
      requests.push({ path: url.pathname, body: JSON.parse(String(options?.body)) });
      return response({ id: 'charge-id' });
    });
    await TestBed.inject(FeesService).createCharge(
      'enrollment-id',
      '2026-09',
      '2026-09-25',
      1234.56,
    );
    expect(requests).toEqual([
      {
        path: '/rest/v1/monthly_charges',
        body: {
          enrollment_id: 'enrollment-id',
          student_id: 'correct-student',
          charge_month: '2026-09-01',
          due_date: '2026-09-25',
          base_amount: 1234.56,
        },
      },
    ]);
  });
  it('rejects charges outside the enrollment validity before insertion', async () => {
    const fetch = vi.fn(async () =>
      response({
        student_id: 'student',
        status: 'active',
        valid_from: '2026-09-01',
        valid_till: '2026-09-30',
      }),
    );
    setup(fetch);
    await expect(
      TestBed.inject(FeesService).createCharge('enrollment-id', '2026-10', '2026-10-25', 100),
    ).rejects.toThrow('within the enrollment dates');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('recovers a committed payment when its response was lost', async () => {
    setup(async (input) =>
      String(input).includes('/rpc/')
        ? response({ message: 'payment_exceeds_balance' }, 400)
        : response({
            id: 'p1',
            status: 'successful',
            monthly_charge_id: 'c1',
            amount: 100.25,
            payment_mode: 'cash',
            receipt: [{ receipt_number: 'RCP-1' }],
          }),
    );
    const result = await TestBed.inject(PaymentsService).record(
      'c1',
      100.25,
      'cash',
      'same-attempt',
    );
    expect(result.payment.id).toBe('p1');
    expect(result.receipt.receipt_number).toBe('RCP-1');
  });
  it('does not turn a mismatched payment or rejected write into success', async () => {
    setup(async (input) =>
      String(input).includes('/rpc/')
        ? response({ message: 'permission denied' }, 403)
        : response({
            id: 'p1',
            status: 'successful',
            monthly_charge_id: 'other-charge',
            amount: 100.25,
            payment_mode: 'cash',
            receipt: [],
          }),
    );
    await expect(
      TestBed.inject(PaymentsService).record('c1', 100.25, 'cash', 'same-attempt'),
    ).rejects.toThrow('This request could not be completed');
  });
  it('builds a student fee statement from charges, payments and refunds', async () => {
    vi.useFakeTimers({ now: new Date('2026-07-15T12:00:00Z') });
    const requests: URL[] = [];
    setup(async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      const table = url.pathname.split('/').pop() ?? '';
      if (table === 'students') {
        return response({ id: 's1', full_name: 'Aarav Patil', student_code: 'TCA-1001' });
      }
      if (table === 'monthly_charge_balances') {
        return response(
          [
            {
              id: 'c1',
              charge_month: '2026-03-01',
              due_date: '2026-03-05',
              final_amount: 2000,
              balance_amount: 1000,
              status: 'partial',
              enrollment: { batch: { name: 'Morning Elite' } },
            },
            {
              id: 'c2',
              charge_month: '2026-04-01',
              due_date: '2026-04-05',
              final_amount: 2500,
              balance_amount: 2500,
              status: 'pending',
              enrollment: { batch: { name: 'Morning Elite' } },
            },
            {
              id: 'c3',
              charge_month: '2026-05-01',
              due_date: '2026-05-05',
              final_amount: 1000,
              balance_amount: 0,
              status: 'paid',
              enrollment: { batch: { name: 'Evening' } },
            },
            {
              id: 'c4',
              charge_month: '2026-06-01',
              due_date: '2026-06-05',
              final_amount: 500,
              balance_amount: 500,
              status: 'waived',
              enrollment: { batch: { name: 'Evening' } },
            },
          ],
          200,
          4,
        );
      }
      if (table === 'payments') {
        return response(
          [
            {
              id: 'p1',
              amount: 1000,
              payment_mode: 'cash',
              paid_at: '2026-03-20T10:30:00+05:30',
              provider_reference: null,
              client_reference: 'CASH-1',
              receipt: { receipt_number: 'RCP-1' },
            },
            {
              id: 'p2',
              amount: 2500,
              payment_mode: 'upi',
              paid_at: '2026-04-10T10:30:00+05:30',
              provider_reference: 'UPI-2',
              client_reference: 'UPI-2',
              receipt: { receipt_number: 'RCP-2' },
            },
          ],
          200,
          2,
        );
      }
      return response(
        [
          {
            id: 'r1',
            amount: 500,
            reason: 'Session cancelled',
            refunded_at: '2026-04-15T10:30:00+05:30',
          },
        ],
        200,
        1,
      );
    });

    const statement = await TestBed.inject(FeesService).statement(
      's1',
      '2026-04-01',
      '2026-04-30',
      'Asia/Kolkata',
    );

    expect(statement.statementNumber).toBe('FES-TCA1001-20260401-20260430');
    expect(statement.studentName).toBe('Aarav Patil');
    expect(statement.batchName).toBe('Evening');
    expect(statement.openingBalance).toBe(1000);
    expect(statement.totalCharges).toBe(2500);
    expect(statement.totalPayments).toBe(2500);
    expect(statement.totalRefunds).toBe(500);
    expect(statement.closingBalance).toBe(1500);
    expect(statement.lines.map((line) => [line.type, line.debit, line.credit, line.balance])).toEqual([
      ['charge', 2500, 0, 3500],
      ['payment', 0, 2500, 1000],
      ['refund', 500, 0, 1500],
    ]);
    expect(statement.lines[0]?.reference).toMatch(/^INV-/);
    expect(statement.lines[1]?.reference).toBe('RCP-2');
    expect(statement.lines[2]?.reference).toMatch(/^REF-/);
    expect(statement.ageing).toEqual([
      { label: 'Not due', amount: 0 },
      { label: '1–30 days', amount: 0 },
      { label: '31–60 days', amount: 0 },
      { label: '61–90 days', amount: 0 },
      { label: 'Over 90 days', amount: 3500 },
    ]);
    const refundRequest = requests.find((url) => url.pathname.endsWith('/payment_refunds'));
    expect(refundRequest?.searchParams.get('payment.student_id')).toBe('eq.s1');
    expect(refundRequest?.searchParams.get('payment.status')).toContain('refunded');
  });
  it('loads refund receipts with the original payment, receipt and approver', async () => {
    const requests: URL[] = [];
    setup(async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      return response(
        [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            payment_id: 'payment-1',
            amount: 500,
            reason: 'Session cancelled',
            client_reference: 'REF-INTERNAL',
            refunded_at: '2026-04-15T10:30:00+05:30',
            payment: {
              id: 'payment-1',
              amount: 1250,
              payment_mode: 'upi',
              paid_at: '2026-04-10T10:30:00+05:30',
              provider_reference: 'UPI-8891',
              client_reference: 'UPI-8891',
              student: { full_name: 'Aarav Patil', student_code: 'TCA-1001' },
              receipt: { receipt_number: 'RCP-1' },
              charge: {
                charge_month: '2026-04-01',
                enrollment: { batch: { name: 'Morning Elite' } },
              },
            },
            approver: { full_name: 'Academy Admin' },
          },
        ],
        200,
        1,
      );
    });

    const receipts = await TestBed.inject(PaymentsService).refundReceipts('payment-1');

    expect(receipts).toEqual([
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        paymentId: 'payment-1',
        refundReceiptNumber: 'RFR-RCP1-174000',
        originalReceiptNumber: 'RCP-1',
        studentName: 'Aarav Patil',
        studentCode: 'TCA-1001',
        refundAmount: 500,
        originalAmount: 1250,
        paymentMode: 'UPI',
        refundedAt: '2026-04-15T10:30:00+05:30',
        paidAt: '2026-04-10T10:30:00+05:30',
        reason: 'Session cancelled',
        reference: 'UPI-8891',
        approvedBy: 'Academy Admin',
        batchName: 'Morning Elite',
        period: 'April 2026',
      },
    ]);
    const request = requests[0]!;
    expect(request.searchParams.get('payment_id')).toBe('eq.payment-1');
    expect(request.searchParams.get('select')).toContain('payment:payments!inner');
    expect(request.searchParams.get('select')).toContain('approver:profiles(full_name)');
  });
});
