import { TestBed } from '@angular/core/testing';
import { NotificationTemplatesService } from '../../core/supabase/domain-services';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { StorageService } from '../../core/supabase/storage.service';
import { ToastService } from '../../shared/toast/toast.service';
import { NotificationTemplatesPage } from './notification-templates-page';

describe('NotificationTemplatesPage backend operations', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup() {
    const api = {
      page: vi.fn().mockResolvedValue({ rows: [{ id: 'one', name: 'Reminder', channel: 'email', template_key: 'reminder', body: 'Hello', status: 'active' }], total: 21 }),
      save: vi.fn().mockResolvedValue({}), setStatus: vi.fn().mockResolvedValue({}),
    };
    const photos: any = {};
    for (const method of ['select', 'eq', 'not', 'limit']) photos[method] = vi.fn().mockReturnValue(photos);
    photos.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn().mockReturnValue(photos);
    TestBed.configureTestingModule({ providers: [
      { provide: NotificationTemplatesService, useValue: api },
      { provide: SupabaseClientService, useValue: { requireClient: () => ({ from }) } },
      { provide: StorageService, useValue: { signedUrl: vi.fn() } },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ] });
    const component = TestBed.runInInjectionContext(() => new NotificationTemplatesPage());
    return { component, state: component as any, api, from, photos };
  }

  it('passes combined filters/sort/page, trusts backend count, without fetching preview photos', async () => {
    const { component, state, api, from } = setup();
    await component.ngOnInit();
    expect(api.page).toHaveBeenCalledTimes(1);
    expect(state.total()).toBe(21); expect(state.rows()).toHaveLength(1);
    state.page.set(3); state.search = ' Reminder '; state.channelFilter = 'email'; state.statusFilter = 'active';
    await state.applyFilters();
    expect(api.page).toHaveBeenLastCalledWith(1, 5, { columns: {}, search: 'Reminder', channel: 'email', status: 'active', sortBy: 'name', sortDirection: 'asc' });
    await state.changeSort('channel'); await state.setPageSize(10); await state.setPage(2);
    expect(api.page).toHaveBeenLastCalledWith(2, 10, { columns: {}, search: 'Reminder', channel: 'email', status: 'active', sortBy: 'channel', sortDirection: 'asc' });
    // Unapplied edits must not silently alter page two's query.
    state.search = 'unapplied'; await state.setPage(1);
    expect(api.page.mock.calls.at(-1)?.[2].search).toBe('Reminder');
    expect(from).not.toHaveBeenCalled();
    component.ngOnDestroy();
  });

  it('deduplicates identical pending queries and ignores older results', async () => {
    const { component, state, api } = setup();
    let resolve!: (value: unknown) => void;
    api.page.mockReturnValueOnce(new Promise(r => resolve = r));
    const old = state.reload();
    expect(state.reload()).toBe(old); expect(api.page).toHaveBeenCalledTimes(1);
    state.search = 'new'; await state.applyFilters();
    resolve({ rows: [], total: 999 }); await old;
    expect(state.total()).toBe(21); expect(state.rows()[0].id).toBe('one');
    expect(state.loading()).toBe(false);
    component.ngOnDestroy();
  });

  it('clears stale data on errors, retries, handles empty results and clamps pages', async () => {
    const { component, state, api } = setup();
    await state.reload();
    api.page.mockRejectedValueOnce(new Error('Network unavailable'));
    await state.reload();
    expect(state.error()).toBe('Network unavailable'); expect(state.rows()).toEqual([]); expect(state.total()).toBe(0);
    await state.reload(); expect(state.error()).toBe('');
    state.page.set(5); api.page.mockResolvedValue({ rows: [], total: 6 });
    await state.reload(); expect(state.page()).toBe(2);
    expect(api.page.mock.calls.at(-1)?.[0]).toBe(2);
    api.page.mockResolvedValue({ rows: [], total: 0 }); await state.applyFilters();
    expect(state.page()).toBe(1); expect(state.rows()).toEqual([]); expect(state.loading()).toBe(false);
    component.ngOnDestroy();
  });

  it('keeps photo preview failures separate from the table and stops destroyed query updates', async () => {
    const { component, state, api, photos } = setup();
    photos.maybeSingle.mockRejectedValue(new Error('Photo unavailable'));
    await component.ngOnInit();
    state.open();
    await state.loadPreviewPhotos();
    expect(state.error()).toBe(''); expect(state.rows()).toHaveLength(1);
    let resolve!: (value: unknown) => void;
    api.page.mockReturnValueOnce(new Promise(r => resolve = r));
    const pending = state.reload(); component.ngOnDestroy();
    resolve({ rows: [], total: 999 }); await pending;
    expect(state.total()).toBe(21);
  });

  it('refreshes the table after a mutation without reloading photos', async () => {
    const { component, state, api, from } = setup();
    await component.ngOnInit();
    await state.toggle(state.rows()[0]);
    expect(api.setStatus).toHaveBeenCalledWith('one', 'inactive');
    expect(api.page).toHaveBeenCalledTimes(2);
    expect(from).not.toHaveBeenCalled();
    component.ngOnDestroy();
  });

  it('blocks a template that uses a placeholder outside its event contract', async () => {
    const { component, state, api } = setup();
    state.open();
    state.form.setValue({
      name: 'Attendance check-in',
      templateKey: 'attendance_check_in',
      channel: 'in_app',
      subject: 'Student checked in',
      body: '{student_name} checked in. Fee: {amount}.',
      status: 'active',
    });

    await state.save();

    expect(api.save).not.toHaveBeenCalled();
    expect(state.formError()).toContain('not part of the attendance_check_in contract');
    expect(state.formError()).toContain('{event_time}');
    expect(state.saving()).toBe(false);
    component.ngOnDestroy();
  });

  it('saves a template that matches its event contract', async () => {
    const { component, state, api } = setup();
    state.open();
    state.form.setValue({
      name: 'Attendance check-in',
      templateKey: 'attendance_check_in',
      channel: 'whatsapp',
      subject: 'Student checked in',
      body: '{student_name} checked in at {event_time}.',
      status: 'active',
    });

    await state.save();

    expect(api.save).toHaveBeenCalledWith({
      name: 'Attendance check-in',
      template_key: 'attendance_check_in',
      channel: 'whatsapp',
      subject: 'Student checked in',
      body: '{student_name} checked in at {event_time}.',
      status: 'active',
    });
    expect(state.formError()).toBe('');
    component.ngOnDestroy();
  });

  it('rejects channels outside the supported policy', async () => {
    const { component, state, api } = setup();
    state.open();
    state.form.setValue({
      name: 'SMS reminder',
      templateKey: 'fee_due_today',
      channel: 'sms' as never,
      subject: 'Fee due',
      body: '{student_name}',
      status: 'active',
    });

    await state.save();

    expect(api.save).not.toHaveBeenCalled();
    expect(state.formError()).toContain('not supported');
    component.ngOnDestroy();
  });
});
