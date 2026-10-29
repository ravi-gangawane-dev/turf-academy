import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';
import { DatabaseService } from './database.service';
import { EnrollmentsService, NotificationTemplatesService } from './domain-services';

function setup(fetch: typeof globalThis.fetch) {
  const client = createClient('https://unit-test.supabase.co', 'unit-test-key', {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  TestBed.configureTestingModule({
    providers: [{ provide: DatabaseService, useValue: { client } }],
  });
  return client;
}

/** The fake PostgREST answers with every row and reports the total the way the real API does. */
function pageResponse(rows: unknown[]) {
  const total = rows.length;
  return new Response(JSON.stringify(rows), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Range': total ? `0-${total - 1}/${total}` : `*/0`,
    },
  });
}

const emptyFilters = {
  search: '',
  action: '',
  studentId: '',
  batchId: '',
  from: '',
  to: '',
};

describe('EnrollmentsService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('loads the students, batches, plans and enrollments that back the workspace', async () => {
    setup(async (input) => {
      const url = new URL(String(input));
      const table = url.pathname.split('/').pop() ?? '';
      const rows: Record<string, unknown[]> = {
        students: [{ id: 's1', student_code: 'ST-1', full_name: 'Aarav', status: 'active' }],
        batches: [{ id: 'b1', code: 'B-1', name: 'U-10', status: 'active', capacity: 20 }],
        fee_plans: [{ id: 'p1', name: 'Monthly', monthly_fee: 1000, status: 'active' }],
        enrollments: [
          {
            id: 'e1',
            student_id: 's1',
            batch_id: 'b1',
            fee_plan_id: 'p1',
            status: 'active',
            valid_from: '2026-09-01',
            valid_till: null,
            monthly_fee: 1000,
            notes: null,
          },
        ],
      };
      return pageResponse(rows[table] ?? []);
    });
    const workspace = await TestBed.inject(EnrollmentsService).workspace();
    expect(workspace.students).toHaveLength(1);
    expect(workspace.batches).toHaveLength(1);
    expect(workspace.plans).toHaveLength(1);
    expect(workspace.enrollments[0]?.student_id).toBe('s1');
  });

  it('scopes the history page to the student, batch, action and date filters', async () => {
    const requests: URL[] = [];
    setup(async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      return pageResponse([
        {
          id: 'h1',
          event_type: 'status_changed',
          effective_on: '2026-09-15',
          created_at: '2026-09-15T10:00:00Z',
        },
      ]);
    });
    const page = await TestBed.inject(EnrollmentsService).historyPage(
      {
        ...emptyFilters,
        search: 'Aarav',
        action: 'paused',
        studentId: 's1',
        batchId: 'b1',
        from: '2026-09-01',
        to: '2026-09-30',
      },
      2,
      5,
    );
    const request = requests[0];
    expect(request.searchParams.get('enrollment.student.full_name')).toBe('ilike.%Aarav%');
    expect(request.searchParams.get('enrollment.student_id')).toBe('eq.s1');
    expect(request.searchParams.get('or')).toBe('(from_batch_id.eq.b1,to_batch_id.eq.b1)');
    expect(request.searchParams.get('event_type')).toBe('eq.status_changed');
    expect(request.searchParams.get('new_status')).toBe('eq.paused');
    expect(request.searchParams.get('effective_on')).toBe('gte.2026-09-01');
    expect(request.searchParams.get('order')).toBe('created_at.desc,id.asc');
    expect(request.searchParams.get('offset')).toBe('5');
    expect(request.searchParams.get('limit')).toBe('5');
    expect(page.rows).toHaveLength(1);
  });

  it('reports the exact number of matching history rows', async () => {
    setup(async () => {
      return pageResponse([{ id: 'h1' }]);
    });
    const page = await TestBed.inject(EnrollmentsService).historyPage(emptyFilters);
    expect(page.total).toBe(1);
  });
});

describe('NotificationTemplatesService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('never lists SMS templates and applies the channel, status and search filters', async () => {
    const requests: URL[] = [];
    setup(async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      return pageResponse([
        { id: 't1', name: 'Birthday email', template_key: 'student_birthday_email', channel: 'email' },
      ]);
    });
    const page = await TestBed.inject(NotificationTemplatesService).page(1, 20, {
      search: 'Birthday',
      channel: 'email',
      status: 'active',
    });
    const request = requests[0];
    expect(request.searchParams.getAll('channel')).toEqual(['neq.sms', 'eq.email']);
    expect(request.searchParams.get('status')).toBe('eq.active');
    expect(request.searchParams.get('or')).toContain('name.ilike.%Birthday%');
    expect(request.searchParams.get('order')).toBe('name.asc,id.asc');
    expect(page.rows).toHaveLength(1);
    expect(page.total).toBe(1);
  });

  it('sorts by the requested column and pages the result set', async () => {
    const requests: URL[] = [];
    setup(async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      return pageResponse([]);
    });
    await TestBed.inject(NotificationTemplatesService).page(3, 10, {
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    });
    const request = requests[0];
    expect(request.searchParams.get('order')).toBe('updated_at.desc,id.asc');
    expect(request.searchParams.get('offset')).toBe('20');
    expect(request.searchParams.get('limit')).toBe('10');
  });
});
