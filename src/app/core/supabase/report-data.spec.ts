import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';
import { DatabaseService } from './database.service';
import { BatchesService, CoachesService, EnrollmentsService, FeesService, ParentsService, ReportsService } from './domain-services';
import { StorageService } from './storage.service';
import { loadPaymentBalances, sumMoney } from './payment-balances';
import { AuthService } from '../auth/auth.service';
import { SupabaseClientService } from './supabase-client.service';
import { ParentPortalService } from '../../features/parents/parent-portal.service';
import { StudentListService } from '../../features/students/student-list.service';

function setup(fetch: typeof globalThis.fetch) {
  const client = createClient('https://unit-test.supabase.co', 'unit-test-key', {
    global: { fetch }, auth: { persistSession: false, autoRefreshToken: false },
  });
  TestBed.configureTestingModule({ providers: [
    { provide: DatabaseService, useValue: { client } },
    { provide: StorageService, useValue: { signedUrl: vi.fn() } },
  ] });
  return client;
}
function pageResponse(url: URL, rows: unknown[], cap = 137) {
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const page = rows.slice(offset, offset + Math.min(cap, Number(url.searchParams.get('limit') ?? 500)));
  return new Response(JSON.stringify(page), { headers: {
    'Content-Type': 'application/json',
    'Content-Range': `${page.length ? `${offset}-${offset + page.length - 1}` : '*'}/${rows.length}`,
  } });
}

describe('Complete report data', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('loads all linked-child charges for parent fee totals beyond the server cap', async () => {
    const charges = Array.from({ length: 1103 }, (_, id) => ({ id: `charge-${id}`, final_amount: 100, paid_amount: 40, balance_amount: 60 }));
    const client = setup(async input => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/monthly_charge_balances')) {
        expect(url.searchParams.get('student_id')).toBe('eq.child-1');
        expect(url.searchParams.get('order')).toBe('due_date.desc,id.asc');
        return pageResponse(url, charges, 137);
      }
      return pageResponse(url, []);
    });
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { profile: () => ({ id: 'parent-profile' }) } },
      { provide: SupabaseClientService, useValue: { requireClient: () => client } },
      { provide: ParentsService, useValue: { getByProfile: async () => ({ id: 'parent-1', student_parents: [{ student: { id: 'child-1' } }] }) } },
      { provide: StudentListService, useValue: { getStudentWorkspace: async () => ({ student: { id: 'child-1' }, enrollment: null }) } },
    ] });
    const data = await TestBed.inject(ParentPortalService).load();
    expect(data.charges).toHaveLength(1103);
    expect(data.charges.at(-1)?.id).toBe('charge-1102');
    localStorage.removeItem('parent-selected-child');
  });

  it('exports every matching parent under a smaller server cap with stable filters and ordering', async () => {
    const rows = Array.from({ length: 1103 }, (_, id) => ({ id: `parent-${id}` }));
    setup(async input => {
      const url = new URL(String(input));
      expect(url.searchParams.get('status')).toBe('eq.active');
      expect(url.searchParams.get('relation')).toBe('eq.Mother');
      expect(url.searchParams.get('or')).toContain('full_name.ilike.%Alex%');
      expect(url.searchParams.get('order')).toBe('full_name.asc,id.asc');
      return pageResponse(url, rows, 137);
    });
    const exported = await TestBed.inject(ParentsService).directoryExport({ search: 'Alex', status: 'active', relation: 'Mother' });
    expect(exported).toHaveLength(1103);
    expect(exported.at(-1)?.id).toBe('parent-1102');
  });

  it('loads every report, enrollment, batch and coach row even when the server cap is below 500', async () => {
    const rows = Array.from({ length: 1103 }, (_, i) => ({ id: `id-${i}`, coach_id: `id-${i}`, full_name: `Coach ${i}` }));
    const requests: URL[] = [];
    setup(async input => {
      const url = new URL(String(input)); requests.push(url);
      return pageResponse(url, rows);
    });
    const reports = TestBed.inject(ReportsService);
    const results = await Promise.all([
      reports.attendance('2026-09-01', '2026-09-30', 'batch-a'),
      reports.charges('2026-09-12', '2026-10-28', 'batch-a', true),
      reports.coaches('2026-09-01', '2026-09-30'),
      TestBed.inject(CoachesService).list(), TestBed.inject(BatchesService).list(),
      TestBed.inject(EnrollmentsService).list(), TestBed.inject(FeesService).charges(),
    ]);
    for (const result of results) {
      expect(result).toHaveLength(1103);
      expect(result.at(-1)?.['id']).toBe('id-1102');
    }
    for (const url of requests) expect(url.searchParams.get('order')).toMatch(/(?:id|coach_id)\.asc/);
    const attendance = requests.filter(url => url.pathname.endsWith('/attendance_records'));
    expect(attendance).toHaveLength(9);
    for (const url of attendance) expect(url.searchParams.get('batch_id')).toBe('eq.batch-a');
    const charges = requests.filter(url => url.searchParams.has('enrollment.batch_id'));
    expect(charges).toHaveLength(9);
    for (const url of charges) {
      expect(url.searchParams.get('enrollment.batch_id')).toBe('eq.batch-a');
      expect(url.searchParams.getAll('charge_month')).toEqual(['gte.2026-09-01', 'lte.2026-10-01']);
      expect(url.searchParams.get('status')).toBe('in.(pending,partial,overdue)');
    }
  });

  it('fails the whole report when a later page fails instead of returning a partial export', async () => {
    setup(async input => {
      const url = new URL(String(input));
      if (Number(url.searchParams.get('offset')) > 0)
        return new Response(JSON.stringify({ message: 'Page unavailable' }), { status: 400 });
      return pageResponse(url, Array.from({ length: 501 }, (_, id) => ({ id })), 500);
    });
    await expect(TestBed.inject(ReportsService).attendance('2026-09-01', '2026-09-30'))
      .rejects.toThrow('This request could not be completed');
  });

  it('keeps partial payments, includes full refunds and applies the same batch/date scope to refunds', async () => {
    const payments = [
      { id: 'partial', amount: 1000.55, status: 'partially_refunded' },
      { id: 'full', amount: 42.1, status: 'refunded' },
      { id: 'paid', amount: 10.2, status: 'successful' },
    ];
    const refunds = [
      { id: 'r1', payment_id: 'partial', amount: 200.25 },
      { id: 'r2', payment_id: 'partial', amount: 0.1 },
      { id: 'r3', payment_id: 'full', amount: 42.1 },
    ];
    setup(async input => {
      const url = new URL(String(input));
      const refund = url.pathname.endsWith('/payment_refunds');
      const prefix = refund ? 'payment.' : '';
      expect(url.searchParams.get(`${prefix}status`)).toBe('in.(successful,partially_refunded,refunded)');
      expect(url.searchParams.getAll(`${prefix}paid_at`)).toEqual(['gte.2026-09-01T00:00:00Z', 'lt.2026-10-01T00:00:00.000Z']);
      expect(url.searchParams.get(`${prefix}charge.enrollment.batch_id`)).toBe('eq.original-batch');
      expect(url.searchParams.get('select')).toContain('monthly_charges!inner(enrollment:enrollments!inner(batch_id))');
      expect(url.searchParams.has('refunded_at')).toBe(false);
      return pageResponse(url, refund ? refunds : payments, 1);
    });
    const rows = await TestBed.inject(ReportsService).collections('2026-09-01', '2026-09-30', 'original-batch');
    expect(rows.map(row => row.net_amount)).toEqual([800.2, 0, 10.2]);
    expect(sumMoney(rows.map(row => row.net_amount))).toBe(810.4);
  });

  it('includes more than ten student payments and more than a server page of refunds', async () => {
    const payments = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, amount: 100, status: i ? 'successful' : 'partially_refunded' }));
    const refunds = Array.from({ length: 1101 }, (_, i) => ({ id: `r${i}`, payment_id: 'p0', amount: 0.01 }));
    const client = setup(async input => {
      const url = new URL(String(input)); const refund = url.pathname.endsWith('/payment_refunds');
      expect(url.searchParams.get(refund ? 'payment.student_id' : 'student_id')).toBe('eq.linked-child');
      return pageResponse(url, refund ? refunds : payments, 100);
    });
    const rows = await loadPaymentBalances(client, { studentId: 'linked-child' });
    expect(rows).toHaveLength(12);
    expect(rows[0]?.net_amount).toBe(88.99);
    expect(sumMoney(rows.map(row => row.net_amount))).toBe(1188.99);
  });
});
