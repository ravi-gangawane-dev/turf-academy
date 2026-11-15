import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';
import { DatabaseService } from './database.service';
import {
  AcademySettingsRecord,
  AcademySettingsService,
  EnrollmentsService,
  NotificationTemplatesService,
} from './domain-services';

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

const printSettingsRecord: AcademySettingsRecord = {
  academy_name: 'Turf Cricket Academy',
  academy_code: 'TCA',
  contact_email: null,
  academy_logo_url: '',
  contact_phone: null,
  academy_description: '',
  address: { line1: '', city: '', state: '', pinCode: '' },
  timezone: 'Asia/Kolkata',
  currency_code: 'INR',
  attendance_grace_minutes: 10,
  fee_due_day: 10,
  notification_channels: ['in_app'],
  theme_preference: 'forest',
  print_registration_number: null,
  print_terms: null,
  print_footer_note: null,
};

function patchBody(init?: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
}

describe('AcademySettingsService print settings', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('saves base settings when the deployed schema has no print columns', async () => {
    const requests: { body: Record<string, unknown>; method: string }[] = [];
    setup(async (_input, init) => {
      requests.push({ body: patchBody(init), method: init?.method ?? 'GET' });
      if (requests.length === 2) {
        return new Response(
          JSON.stringify({
            code: 'PGRST204',
            message: "Could not find the 'print_registration_number' column in the schema cache",
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ academy_name: 'Turf Cricket Academy' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const saved = await TestBed.inject(AcademySettingsService).save(printSettingsRecord);

    expect(requests).toHaveLength(2);
    expect(requests[0].method).toBe('PATCH');
    expect(requests[0].body).not.toHaveProperty('print_registration_number');
    expect(saved.academy_name).toBe('Turf Cricket Academy');
  });

  it('reports a clear error when configured print values cannot be stored', async () => {
    let calls = 0;
    setup(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ academy_name: 'Turf Cricket Academy' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          code: 'PGRST204',
          message: "Could not find the 'print_terms' column in the schema cache",
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    });

    await expect(
      TestBed.inject(AcademySettingsService).save({
        ...printSettingsRecord,
        print_registration_number: 'REG-42',
      }),
    ).rejects.toThrow(/Apply the print settings migration/);
  });

  it('stores print values in a separate update when the columns exist', async () => {
    const requests: { body: Record<string, unknown>; method: string }[] = [];
    setup(async (_input, init) => {
      requests.push({ body: patchBody(init), method: init?.method ?? 'GET' });
      return new Response(
        JSON.stringify({
          academy_name: 'Turf Cricket Academy',
          print_registration_number: 'REG-42',
          print_terms: 'Fees are due on the tenth.',
          print_footer_note: 'Fees once paid are non-refundable.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const saved = await TestBed.inject(AcademySettingsService).save({
      ...printSettingsRecord,
      print_registration_number: 'REG-42',
      print_terms: 'Fees are due on the tenth.',
      print_footer_note: 'Fees once paid are non-refundable.',
    });

    expect(requests[0].body).not.toHaveProperty('print_registration_number');
    expect(requests[1].body).toMatchObject({
      print_registration_number: 'REG-42',
      print_terms: 'Fees are due on the tenth.',
      print_footer_note: 'Fees once paid are non-refundable.',
    });
    expect('print_registration_number' in saved).toBe(true);
  });
});
