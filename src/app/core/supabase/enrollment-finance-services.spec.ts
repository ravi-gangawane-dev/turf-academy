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
  afterEach(() => TestBed.resetTestingModule());
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
});
