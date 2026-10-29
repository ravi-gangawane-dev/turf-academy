import { SupabaseClient } from '@supabase/supabase-js';
import { loadPaymentBalances, sumMoney } from './payment-balances';

interface FakePage {
  data: unknown[];
  error: null;
  count: number;
}

interface FakeQuery {
  readonly table: string;
  readonly filters: string[];
  range: [number, number];
}

function fakeClient(rows: { payments?: unknown[]; refunds?: unknown[] }) {
  const queries: FakeQuery[] = [];
  const client = {
    from(table: string) {
      const query: FakeQuery = { table, filters: [], range: [0, 499] };
      queries.push(query);
      const builder = {
        select: () => builder,
        in: (column: string, values: readonly string[]) => {
          query.filters.push(`in:${column}=${values.join(',')}`);
          return builder;
        },
        order: () => builder,
        eq: (column: string, value: string) => {
          query.filters.push(`eq:${column}=${value}`);
          return builder;
        },
        gte: (column: string, value: string) => {
          query.filters.push(`gte:${column}=${value}`);
          return builder;
        },
        lt: (column: string, value: string) => {
          query.filters.push(`lt:${column}=${value}`);
          return builder;
        },
        range: (from: number, to: number) => {
          query.range = [from, to];
          return builder;
        },
        then: (onfulfilled: (value: FakePage) => unknown) => {
          const data = table === 'payments' ? (rows.payments ?? []) : (rows.refunds ?? []);
          return Promise.resolve(onfulfilled({ data, error: null, count: data.length }));
        },
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, queries };
}

describe('sumMoney', () => {
  it('adds amounts in minor units so totals never drift', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([1000.55, 200.25])).toBe(1200.8);
  });

  it('returns zero for an empty list', () => {
    expect(sumMoney([])).toBe(0);
  });

  it('keeps negative adjustments', () => {
    expect(sumMoney([10, -2.5])).toBe(7.5);
  });
});

describe('loadPaymentBalances', () => {
  it('nets refunds against the payment they belong to', async () => {
    const { client } = fakeClient({
      payments: [
        { id: 'p1', student_id: 's1', amount: 1000.55, status: 'successful' },
        { id: 'p2', student_id: 's1', amount: 42.1, status: 'refunded' },
      ],
      refunds: [
        { id: 'r1', payment_id: 'p1', amount: 200.25 },
        { id: 'r2', payment_id: 'p1', amount: 0.1 },
        { id: 'r3', payment_id: 'p2', amount: 42.1 },
      ],
    });
    const balances = await loadPaymentBalances(client, {});
    expect(balances).toHaveLength(2);
    expect(balances[0]?.refunded_amount).toBe(200.35);
    expect(balances[0]?.net_amount).toBe(800.2);
    expect(balances[1]?.refunded_amount).toBe(42.1);
    expect(balances[1]?.net_amount).toBe(0);
  });

  it('only settles successful, partially refunded and refunded payments', async () => {
    const { client, queries } = fakeClient({ payments: [], refunds: [] });
    await loadPaymentBalances(client, {});
    const paymentQuery = queries.find((query) => query.table === 'payments');
    const refundQuery = queries.find((query) => query.table === 'payment_refunds');
    expect(paymentQuery?.filters).toContain(
      'in:status=successful,partially_refunded,refunded',
    );
    expect(refundQuery?.filters).toContain(
      'in:payment.status=successful,partially_refunded,refunded',
    );
  });

  it('applies the student, date and batch scope to payments and refunds alike', async () => {
    const { client, queries } = fakeClient({ payments: [], refunds: [] });
    await loadPaymentBalances(client, {
      studentId: 'student-1',
      from: '2026-09-01',
      to: '2026-09-30',
      batchId: 'batch-1',
    });
    const paymentQuery = queries.find((query) => query.table === 'payments');
    const refundQuery = queries.find((query) => query.table === 'payment_refunds');
    expect(paymentQuery?.filters).toEqual(
      expect.arrayContaining([
        'eq:student_id=student-1',
        'gte:paid_at=2026-09-01T00:00:00Z',
        'lt:paid_at=2026-10-01T00:00:00.000Z',
        'eq:charge.enrollment.batch_id=batch-1',
      ]),
    );
    expect(refundQuery?.filters).toEqual(
      expect.arrayContaining([
        'eq:payment.student_id=student-1',
        'gte:payment.paid_at=2026-09-01T00:00:00Z',
        'lt:payment.paid_at=2026-10-01T00:00:00.000Z',
        'eq:payment.charge.enrollment.batch_id=batch-1',
      ]),
    );
  });

  it('leaves a payment without refunds fully payable', async () => {
    const { client } = fakeClient({
      payments: [{ id: 'p1', student_id: 's1', amount: 500, status: 'successful' }],
      refunds: [],
    });
    const balances = await loadPaymentBalances(client, {});
    expect(balances[0]?.refunded_amount).toBe(0);
    expect(balances[0]?.net_amount).toBe(500);
  });
});
