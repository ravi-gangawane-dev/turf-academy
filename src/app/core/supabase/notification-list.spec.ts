import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';
import { DatabaseService } from './database.service';
import { NotificationsService } from './domain-services';

describe('Notification backend list query', () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup() {
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify([{ id: 'one' }]), {
      headers: { 'Content-Type': 'application/json', 'Content-Range': '5-5/21' },
    }));
    const client = createClient('https://unit-test.supabase.co', 'unit-test-key', {
      global: { fetch }, auth: { persistSession: false, autoRefreshToken: false },
    });
    TestBed.configureTestingModule({ providers: [{ provide: DatabaseService, useValue: { client } }] });
    return { api: TestBed.inject(NotificationsService), fetch };
  }

  it('combines exact category, scope, status, search, stable sorting and backend count', async () => {
    const { api, fetch } = setup();
    const result = await api.page(2, 5, 'sent', 'in_app', 'parent-id', 'attendance_check_in', {
      search: ' Aarav ', sortBy: 'subject', sortDirection: 'asc',
    });
    const query = new URL(String(fetch.mock.calls[0][0])).searchParams;
    expect(query.get('template_key')).toBe('eq.attendance_check_in');
    expect(query.get('status')).toBe('eq.sent');
    expect(query.get('channel')).toBe('eq.in_app');
    expect(query.get('parent_id')).toBe('eq.parent-id');
    expect(query.get('or')).toContain('subject.ilike.%Aarav%');
    expect(query.get('order')).toBe('subject.asc,id.asc');
    expect(query.get('offset')).toBe('5');
    expect(query.get('limit')).toBe('5');
    expect(result.total).toBe(21);
    expect(result.rows).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps birthday matching across student and coach template variants', async () => {
    const { api, fetch } = setup();
    await api.page(1, 5, undefined, undefined, undefined, 'birthday');
    expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('template_key')).toBe('ilike.%birthday%');
  });

  it('applies exact student, recipient and historical batch scope to list and every count', async () => {
    const { api, fetch } = setup();
    const filters = {studentId:'student-id',recipientId:'coach:coach-id',batchId:'batch-id'};
    await api.page(1,5,undefined,undefined,undefined,undefined,filters);
    await api.counts(undefined,filters);
    for (const call of fetch.mock.calls) {
      const query = new URL(String(call[0])).searchParams;
      expect(query.get('student_id')).toBe('eq.student-id');
      expect(query.get('coach_id')).toBe('eq.coach-id');
      expect(query.get('source_batch_id')).toBe('eq.batch-id');
    }
    fetch.mockClear();
    await api.page(1,5,undefined,undefined,undefined,undefined,{batchId:'unlinked',recipientId:'parent:parent-id'});
    const query = new URL(String(fetch.mock.calls[0][0])).searchParams;
    expect(query.get('source_batch_id')).toBe('is.null');
    expect(query.get('parent_id')).toBe('eq.parent-id');
  });

  it('records manual activity through the trusted RPC only', async () => {
    const { api, fetch } = setup();
    const saved = { recipient: '9876543210', body: 'Snapshot', manual_state: 'confirmed_sent' };
    fetch.mockResolvedValueOnce(new Response(JSON.stringify([saved])));
    expect(await api.manualWhatsApp('notice-id', 'confirm')).toEqual(saved);
    expect(String(fetch.mock.calls[0][0])).toContain('/rpc/record_manual_whatsapp');
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ p_id: 'notice-id', p_action: 'confirm' });
  });

  it('excludes manual activity from provider delivery counts but includes it in total', async () => {
    const { api, fetch } = setup();
    await api.counts();
    const queries = fetch.mock.calls.map(call => new URL(String(call[0])).searchParams);
    expect(queries[0].has('manual_state')).toBe(false);
    expect(queries.slice(1).every(query => query.get('manual_state') === 'is.null')).toBe(true);
  });

  it('keeps counts usable before the additive migration, even with bodyless HEAD errors', async () => {
    const { api, fetch } = setup();
    fetch.mockImplementation(async (input) => {
      const query = new URL(String(input)).searchParams;
      if (query.has('manual_state')) return new Response(null, { status: 400 });
      if (query.get('select') === 'manual_state') return new Response(JSON.stringify({ code: '42703', message: 'column notifications.manual_state does not exist' }), { status: 400 });
      return new Response(null, { headers: { 'Content-Range': '0-0/1' } });
    });
    expect(await api.counts()).toEqual({ all: 1, delivered: 1, pending: 1, failed: 1 });
    expect(fetch.mock.calls.filter(call => new URL(String(call[0])).searchParams.get('select') === 'manual_state')).toHaveLength(1);
  });

  it('loads a bounded, stably ordered timeline scoped to one notification', async () => {
    const { api, fetch } = setup();
    await api.history('notice-id');
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.pathname).toContain('/notification_events');
    expect(url.searchParams.get('notification_id')).toBe('eq.notice-id');
    expect(url.searchParams.get('order')).toBe('occurred_at.desc,id.desc');
    expect(url.searchParams.get('limit')).toBe('100');
  });

  it('uses read evidence rather than delivery status for unread messages', async () => {
    const { api, fetch } = setup();
    await api.page(1, 20, 'unread');
    const query = new URL(String(fetch.mock.calls[0][0])).searchParams;
    expect(query.get('read_at')).toBe('is.null');
    expect(query.has('status')).toBe(false);
  });

  it('combines inclusive academy timezone dates with recipient and channel filters', async () => {
    const { api, fetch } = setup();
    await api.page(1, 20, 'failed', 'whatsapp', undefined, undefined, {
      from: '2026-10-01', to: '2026-10-22', columns: { cf_recipient: 'Parent' },
    });
    const query = new URL(String(fetch.mock.calls[0][0])).searchParams;
    expect(query.getAll('created_at')).toEqual([
      'gte.2026-09-30T18:30:00.000Z',
      'lt.2026-10-22T18:30:00.000Z',
    ]);
    expect(query.get('status')).toBe('eq.failed');
    expect(query.get('channel')).toBe('eq.whatsapp');
    expect(query.get('recipient')).toBe('ilike.%Parent%');
  });

  it('treats column date filters as academy-timezone calendar days', async () => {
    const { api, fetch } = setup();
    await api.page(1, 20, undefined, undefined, undefined, undefined, {
      columns: { cf_createdAt: '2026-10-13' },
    });
    const query = new URL(String(fetch.mock.calls[0][0])).searchParams;
    expect(query.getAll('created_at')).toEqual([
      'gte.2026-10-12T18:30:00.000Z',
      'lt.2026-10-13T18:30:00.000Z',
    ]);
  });

  it('supports processing records in the status column filter', async () => {
    const { api, fetch } = setup();
    await api.page(1, 20, undefined, undefined, undefined, undefined, {
      columns: { cf_status: 'sending' },
    });
    expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('status')).toBe('in.(sending)');
  });

  it('counts only queued and processing records as pending, with channel scope', async () => {
    const { api, fetch } = setup();
    const result = await api.counts('in_app');
    const queries = fetch.mock.calls.map(call => new URL(String(call[0])).searchParams);
    expect(queries).toHaveLength(4);
    expect(queries.every(query => query.get('channel') === 'eq.in_app')).toBe(true);
    expect(queries.map(query => query.get('status'))).toEqual([
      null, 'in.(delivered)', 'in.(queued,sending)', 'in.(failed)',
    ]);
    expect(result.pending).toBe(21);
  });

  it('applies identical recipient/student/date/type/search constraints to rows and all summaries', async () => {
    const { api, fetch } = setup();
    const filters = {
      from: '2026-10-01', to: '2026-10-22', studentName: 'Aarav', search: 'Reminder',
      columns: { cf_recipient: 'parent@example.test', cf_templateKey: 'birthday', cf_status: 'failed' },
    };
    await api.page(2, 5, 'failed', 'email', 'parent-id', 'birthday', filters);
    await api.counts('email', { ...filters, status: 'failed', parentId: 'parent-id', templateCategory: 'birthday' });
    const queries = fetch.mock.calls.map(call => new URL(String(call[0])).searchParams);
    expect(queries).toHaveLength(5);
    expect(queries[0].get('select')).toContain('student:students!inner(full_name)');
    expect(queries[0].get('student.full_name')).toBe('ilike.%Aarav%');
    for (const summary of queries.slice(1)) {
      for (const key of ['select', 'channel', 'parent_id', 'student.full_name', 'recipient', 'created_at', 'template_key', 'or']) {
        expect(summary.getAll(key), key).toEqual(queries[0].getAll(key));
      }
      expect(summary.getAll('status')).toEqual(expect.arrayContaining(['eq.failed', 'in.(failed)']));
      expect(summary.has('offset')).toBe(false);
      expect(summary.has('limit')).toBe(false);
    }
    expect(queries[2].getAll('status')).toContain('in.(delivered)');
    expect(queries[3].getAll('status')).toContain('in.(queued,sending)');
  });

  it('keeps notifications without linked students when no student filter is requested', async () => {
    const { api, fetch } = setup();
    await api.page(1, 5);
    const query = new URL(String(fetch.mock.calls[0][0])).searchParams;
    expect(query.get('select')).toContain('student:students(full_name)');
    expect(query.get('select')).not.toContain('!inner');
    expect(query.has('student.full_name')).toBe(false);
  });
});
