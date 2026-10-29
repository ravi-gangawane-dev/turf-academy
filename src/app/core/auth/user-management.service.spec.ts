import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { ManagedUserQuery, UserManagementService } from './user-management.service';

describe('User management backend pagination', () => {
  afterEach(() => TestBed.resetTestingModule());
  const query: ManagedUserQuery = {
    page: 2, pageSize: 5, search: '', role: '', status: '',
    filters: { name: ' Ravi ', contact: '', role: 'admin', status: '', joined: '' },
    sortBy: 'createdAt', sortDirection: 'desc',
  };
  function setup(data: unknown) {
    const invoke = vi.fn().mockResolvedValue({ data, error: null });
    TestBed.configureTestingModule({ providers: [{ provide: SupabaseClientService,
      useValue: { requireClient: () => ({ functions: { invoke } }) } }] });
    return { api: TestBed.inject(UserManagementService), invoke };
  }
  it('passes filters and paging to the function and uses its exact total', async () => {
    const result = { users: [{ id: 'u6' }], total: 6, page: 2, pageSize: 5 };
    const { api, invoke } = setup(result);
    expect(await api.list(query)).toEqual(result);
    expect(invoke).toHaveBeenCalledWith('admin-manage-users', { body: {
      action: 'list', ...query, filters: { ...query.filters, name: 'Ravi' },
    } });
  });
  it('defaults invalid sizes to five rather than a different page size', async () => {
    const { api, invoke } = setup({ users: [], total: 0, page: 1, pageSize: 5 });
    await api.list({ ...query, pageSize: 25 });
    expect(invoke.mock.calls[0][1].body.pageSize).toBe(5);
  });
  it('rejects legacy responses that omit pagination metadata', async () => {
    const { api } = setup({ users: [] });
    await expect(api.list(query)).rejects.toThrow();
  });
});
