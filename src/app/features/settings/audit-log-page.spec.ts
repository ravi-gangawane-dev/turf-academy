import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DatabaseService } from '../../core/supabase/database.service';
import { AuditLogPage } from './audit-log-page';

function setup() {
  const rpc = vi.fn().mockResolvedValue({ data: { rows: [], total: 100 }, error: null });
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: DatabaseService, useValue: { client: { rpc } } }],
  });
  const fixture = TestBed.createComponent(AuditLogPage);
  return { fixture, page: fixture.componentInstance, rpc };
}
describe('Audit column filters and sorting', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  it('renders five sortable headings and five matching filters', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-sortable-header')).toHaveLength(5);
    expect(fixture.nativeElement.querySelectorAll('.column-filters input')).toHaveLength(5);
    expect(fixture.nativeElement.querySelector('th[aria-sort="descending"]').textContent).toContain(
      'Date',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Apply filter');
    const tabs = Array.from(fixture.nativeElement.querySelectorAll('.settings-tabs a')) as HTMLAnchorElement[];
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      'All Settings', 'Profile', 'Operations', 'Attendance', 'Notifications', 'Users & Roles', 'Audit Log', 'Tools & Data',
    ]);
    expect(tabs.find((tab) => tab.textContent?.trim() === 'Audit Log')?.getAttribute('aria-current')).toBe('page');
  });
  it('sends every filter, sort and selected page size to the backend', async () => {
    const { page, rpc } = setup();
    page['filters'] = {
      date: '2026-10-13',
      action: ' update ',
      table: 'students',
      record: '4000',
      account: '79c6',
    };
    await page['load'](2);
    expect(rpc).toHaveBeenLastCalledWith('get_audit_log_page', {
      p_offset: 5,
      p_limit: 5,
      p_filters: {
        date: '2026-10-13',
        action: 'update',
        table: 'students',
        record: '4000',
        account: '79c6',
      },
      p_sort_by: 'occurred_at',
      p_sort_direction: 'desc',
    });
    await page['sortColumn']('actor_id');
    expect(rpc.mock.calls.at(-1)![1]).toMatchObject({
      p_offset: 0,
      p_sort_by: 'actor_id',
      p_sort_direction: 'asc',
    });
    await page['sortColumn']('actor_id');
    expect(rpc.mock.calls.at(-1)![1].p_sort_direction).toBe('desc');
    await page['setPageSize'](20);
    expect(rpc.mock.calls.at(-1)![1]).toMatchObject({ p_offset: 0, p_limit: 20 });
    await page['resetFilters']();
    expect(rpc.mock.calls.at(-1)![1]).toMatchObject({
      p_filters: { date: '', action: '', table: '', record: '', account: '' },
      p_sort_by: 'occurred_at',
      p_sort_direction: 'desc',
    });
  });
  it('debounces typing and ignores a response from an older filter', async () => {
    vi.useFakeTimers();
    const { page, rpc } = setup();
    let resolve!: (value: unknown) => void;
    rpc.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const old = page['load'](1);
    page['filters'].action = 'INSERT';
    page['scheduleFilters']();
    page['filters'].action = 'UPDATE';
    page['scheduleFilters']();
    resolve({ data: { rows: [{ id: 1 }], total: 1 }, error: null });
    await old;
    expect(page['rows']()).toEqual([]);
    await vi.advanceTimersByTimeAsync(250);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls.at(-1)![1].p_filters.action).toBe('UPDATE');
  });
});
