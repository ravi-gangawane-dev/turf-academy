import { BehaviorSubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationsService } from '../../core/supabase/domain-services';
import { NotificationsPage } from './notifications-page';

describe('Notifications list state', () => {
  afterEach(() => { vi.useRealTimers(); TestBed.resetTestingModule(); });
  function setup() {
    const api = {
      page: vi.fn().mockResolvedValue({ rows: [{ id: 'n', subject: 'Result' }], total: 21 }),
      counts: vi.fn().mockResolvedValue({ all: 21, delivered: 0, pending: 21, failed: 0 }),
      deliveryAction: vi.fn().mockResolvedValue({ channels: ['in_app'] }),
    };
    const queryParams = new BehaviorSubject(convertToParamMap({channel:'whatsapp'}));
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [
      { provide: NotificationsService, useValue: api },
      { provide: AuthService, useValue: {} },
      { provide: ActivatedRoute, useValue: { queryParamMap: queryParams } },
      { provide: Router, useValue: { navigate } },
    ] });
    // Exercise state without running template lifecycle twice.
    const component = TestBed.runInInjectionContext(() => new NotificationsPage());
    const state = component as any;
    return { api, component, state, queryParams, navigate };
  }
  it('uses backend rows/count and combines controls while resetting the page', async () => {
    const { api, component, state } = setup();
    await component.ngOnInit();
    expect(api.page).toHaveBeenCalledTimes(1);
    expect(state.rows()).toHaveLength(1); // No browser channel/status filtering.
    expect(state.total()).toBe(21);
    state.page.set(3);
    state.filter.set('sent'); state.categoryFilter.set('birthday');
    state.search.set('Aarav'); state.sortBy.set('subject'); state.sortDirection.set('asc');
    state.setPageSize(20); await state.reload();
    expect(api.page).toHaveBeenLastCalledWith(1, 20, 'sent', 'whatsapp', undefined, 'birthday',
      { from: undefined, to: undefined, studentName: undefined, columns: {}, search: 'Aarav', sortBy: 'subject', sortDirection: 'asc' });
    expect(api.page).toHaveBeenCalledTimes(2);
    component.ngOnDestroy();
  });

  it('shares combined filters with summaries and resets stale totals on errors', async () => {
    const { api, component, state, queryParams, navigate } = setup();
    await component.ngOnInit();
    queryParams.next(convertToParamMap({ channel: 'email', status: 'failed', student: 'Aarav', from: '2026-10-01', cf_recipient: 'Parent', type: 'birthday' }));
    await state.reload(false);
    expect(state.studentName()).toBe('Aarav');
    expect(api.counts).toHaveBeenLastCalledWith('email', {
      status: 'failed', templateCategory: 'birthday', studentName: 'Aarav',
      from: '2026-10-01', to: undefined, columns: { cf_recipient: 'Parent' }, search: '',
    });
    api.counts.mockRejectedValueOnce(new Error('Summary unavailable'));
    await state.reload(false);
    expect(state.error()).toBe('Summary unavailable');
    expect(state.counts()).toEqual({ all: 0, delivered: 0, pending: 0, failed: 0 });
    expect(state.rows()).toEqual([]);
    state.clearFilters();
    await state.reload();
    expect(state.studentName()).toBe('');
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({queryParams:{}}));
    component.ngOnDestroy();
  });
  it('restores navigation changes and persists clear-all without hidden route filters', async () => {
    const { api, component, state, queryParams, navigate } = setup();
    await component.ngOnInit();
    queryParams.next(convertToParamMap({channel:'email',status:'failed',from:'2026-10-01',to:'2026-10-22',cf_recipient:'Parent',pageSize:'20'}));
    await state.reload(false);
    expect(api.page).toHaveBeenLastCalledWith(1,20,'failed','email',undefined,undefined,expect.objectContaining({
      from:'2026-10-01',to:'2026-10-22',columns:{cf_recipient:'Parent'},
    }));
    const calls = api.page.mock.calls.length;
    queryParams.next(convertToParamMap({channel:'email',status:'failed',from:'2026-10-01',to:'2026-10-22',cf_recipient:'Parent',pageSize:'20'}));
    expect(api.page).toHaveBeenCalledTimes(calls);
    state.clearFilters();
    await state.reload();
    expect(state.channel()).toBe('');
    expect(state.filter()).toBe('all');
    expect(state.from()).toBe('');
    expect(state.columns.values()).toEqual({});
    expect(navigate).toHaveBeenLastCalledWith([],expect.objectContaining({queryParams:{pageSize:20}}));
    component.ngOnDestroy();
  });

  it('rejects an inverted edited date range without querying the backend', async () => {
    const { api, component, state } = setup();
    await component.ngOnInit();
    const calls = api.page.mock.calls.length;
    state.from.set('2026-10-22'); state.to.set('2026-10-01');
    await state.reload();
    expect(api.page).toHaveBeenCalledTimes(calls);
    expect(state.error()).toContain('From date');
    expect(state.loading()).toBe(false);
    component.ngOnDestroy();
  });
  it('debounces search, cancels the timer when another control loads, and ignores stale results', async () => {
    vi.useFakeTimers();
    const { api, component, state } = setup();
    let resolve!: (value: unknown) => void;
    api.page.mockReturnValueOnce(new Promise(r => resolve = r));
    const old = state.reload();
    state.setSearch('A'); state.setSearch('Aa'); state.setSearch('Aarav');
    resolve({ rows: [{ id: 'stale' }], total: 999 }); await old;
    expect(state.rows()).toEqual([]);
    expect(state.loading()).toBe(true);
    await vi.advanceTimersByTimeAsync(250);
    expect(api.page).toHaveBeenCalledTimes(2);
    expect(state.total()).toBe(21);
    state.setSearch('next'); state.setFilter('sent'); await state.reload();
    await vi.advanceTimersByTimeAsync(250);
    expect(api.page).toHaveBeenCalledTimes(3);
    state.setSearch('destroyed'); component.ngOnDestroy();
    await vi.advanceTimersByTimeAsync(250);
    expect(api.page).toHaveBeenCalledTimes(3);
  });
  it('deduplicates pending loads and supports empty, failure, retry and shrinking totals', async () => {
    const { api, component, state } = setup();
    let resolve!: (value: unknown) => void;
    api.page.mockReturnValueOnce(new Promise(r => resolve = r));
    const pending = state.reload();
    expect(state.reload()).toBe(pending);
    expect(api.page).toHaveBeenCalledTimes(1);
    resolve({ rows: [], total: 0 }); await pending;
    expect(state.rows()).toEqual([]); expect(state.total()).toBe(0); expect(state.loading()).toBe(false);
    api.page.mockRejectedValueOnce(new Error('Offline'));
    await state.reload();
    expect(state.error()).toBe('Offline'); expect(state.total()).toBe(0);
    await state.reload(); expect(state.error()).toBe(''); expect(state.total()).toBe(21);
    state.page.set(5);
    api.page.mockResolvedValue({ rows: [], total: 6 });
    await state.reload();
    expect(state.page()).toBe(2);
    expect(api.page.mock.calls.at(-1)?.[0]).toBe(2);
    component.ngOnDestroy();
  });
});
