import { TestBed } from '@angular/core/testing';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '../../core/auth/auth.service';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { StorageService } from '../../core/supabase/storage.service';
import { CoachPortalService } from './coach-portal.service';

describe('Complete coach dashboard and schedule reads', () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup(total: number, failAfterFirst = false, emptyAfterFirst = false) {
    const requests: URL[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      requests.push(url);
      const offset = Number(url.searchParams.get('offset'));
      if (offset && failAfterFirst) return new Response(JSON.stringify({ message: 'Second page unavailable' }), { status: 400 });
      // Deliberately smaller than the requested page size, as a capped server can be.
      const count = offset && emptyAfterFirst ? 0 : Math.min(137, total - offset);
      const rows = Array.from({ length: count }, (_, index) => ({ id: `row-${offset + index}`, status: offset + index >= 2000 ? 'absent' : 'present' }));
      return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json', 'Content-Range': `${offset}-${offset + count - 1}/${total}` } });
    });
    const client = createClient('https://unit-test.supabase.co', 'unit-test-key', { global: { fetch }, auth: { persistSession: false, autoRefreshToken: false } });
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: {} },
      { provide: StorageService, useValue: {} },
      { provide: SupabaseClientService, useValue: { requireClient: () => client } },
    ] });
    return { api: TestBed.inject(CoachPortalService), requests, fetch };
  }

  it('includes attendance beyond 2,000 rows without losing statuses used by dashboard totals', async () => {
    const { api, requests } = setup(2401);
    const rows = await api.loadDashboardAttendance(['assigned-a', 'assigned-b']);
    expect(rows).toHaveLength(2401);
    expect(new Set(rows.map(row => row.id)).size).toBe(2401);
    expect(rows.filter(row => row.status === 'absent')).toHaveLength(401);
    expect(requests).toHaveLength(18);
    for (const [index, request] of requests.entries()) {
      expect(request.searchParams.get('batch_id')).toBe('in.(assigned-a,assigned-b)');
      expect(request.searchParams.get('attendance_date')).toBe(requests[0].searchParams.get('attendance_date'));
      expect(request.searchParams.get('order')).toBe('attendance_date.desc,id.asc');
      expect(request.searchParams.get('offset')).toBe(String(index * 137));
      expect(request.searchParams.get('limit')).toBe('500');
    }
  });

  it('includes every session beyond 1,000 while keeping scope, date window and stable order', async () => {
    const { api, requests } = setup(1301);
    const rows = await api.loadSessions(['assigned-a']);
    expect(rows).toHaveLength(1301);
    expect(rows.at(-1)?.id).toBe('row-1300');
    expect(requests).toHaveLength(10);
    for (const request of requests) {
      expect(request.searchParams.get('batch_id')).toBe('in.(assigned-a)');
      expect(request.searchParams.getAll('session_date')).toEqual(requests[0].searchParams.getAll('session_date'));
      expect(request.searchParams.getAll('session_date')).toHaveLength(2);
      expect(request.searchParams.get('order')).toBe('session_date.asc,start_time.asc,id.asc');
      expect(request.searchParams.get('limit')).toBe('500');
    }
  });

  it.each(['attendance', 'sessions'])('rejects %s page failure instead of returning misleading partial data', async kind => {
    const { api } = setup(600, true);
    await expect(kind === 'attendance' ? api.loadDashboardAttendance(['a']) : api.loadSessions(['a'])).rejects.toThrow();
  });

  it('rejects an unexpectedly empty page before the reported total', async () => {
    const { api } = setup(600, false, true);
    await expect(api.loadSessions(['a'])).rejects.toThrow('Some records could not be loaded');
  });

  it('makes no queries when the coach has no assigned batches', async () => {
    const { api, fetch } = setup(1);
    expect(await api.loadDashboardAttendance([])).toEqual([]);
    expect(await api.loadSessions([])).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
