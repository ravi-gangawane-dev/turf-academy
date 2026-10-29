import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';
import { DatabaseService } from './database.service';
import { NotificationTemplatesService } from './domain-services';

describe('Template backend list query', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup() {
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify([{ id: 'one' }]), {
      headers: { 'Content-Type': 'application/json', 'Content-Range': '5-5/17' },
    }));
    const client = createClient('https://unit-test.supabase.co', 'unit-test-key', {
      global: { fetch }, auth: { persistSession: false, autoRefreshToken: false },
    });
    TestBed.configureTestingModule({ providers: [{ provide: DatabaseService, useValue: { client } }] });
    return { api: TestBed.inject(NotificationTemplatesService), fetch };
  }
  it('excludes SMS before count/range and combines search, filters and stable sorting', async () => {
    const { api, fetch } = setup();
    const result = await api.page(2, 5, { search: ' Birthday ', channel: 'email', status: 'active', sortBy: 'updatedAt', sortDirection: 'desc' });
    const query = new URL(String(fetch.mock.calls[0][0])).searchParams;
    expect(query.getAll('channel')).toEqual(['neq.sms', 'eq.email']);
    expect(query.get('status')).toBe('eq.active');
    expect(query.get('or')).toContain('name.ilike.%Birthday%');
    expect(query.get('order')).toBe('updated_at.desc,id.asc');
    expect(query.get('offset')).toBe('5'); expect(query.get('limit')).toBe('5');
    expect(result.total).toBe(17); expect(result.rows).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('fetches only the six preview keys independently of table filters', async () => {
    const { api, fetch } = setup(); await api.birthdayPreviews();
    const query = new URL(String(fetch.mock.calls[0][0])).searchParams;
    expect(query.get('limit')).toBe('6');
    expect(query.get('template_key')).toBe('in.(student_birthday,student_birthday_email,student_birthday_whatsapp,coach_birthday,coach_birthday_email,coach_birthday_whatsapp)');
    expect(query.get('select')).toBe('template_key,subject,body');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
