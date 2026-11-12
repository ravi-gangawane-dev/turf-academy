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
  it('surfaces a safe provider error code from a non-2xx response', async () => {
    const { api, invoke } = setup(null);
    invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({code:'account_exists',error:'private provider details'}), {status:409}) } } as never);
    await expect(api.invite({fullName:'Ravi',email:'ravi@example.com',role:'admin'})).rejects.toThrow('An account already exists');
  });
  it('does not send browser origin as the invitation redirect', async () => {
    const {api,invoke}=setup({userId:'invited'});
    await api.invite({fullName:' Ravi ',email:'RAVI@example.com',role:'admin'});
    expect(invoke.mock.calls[0][1].body).toEqual({action:'invite',fullName:'Ravi',email:'ravi@example.com',role:'admin',phone:undefined});
  });
  it('sends resend and revoke requests for the same email or invitation', async () => {    const { api, invoke } = setup({ message: 'Invitation resent.' });
    await api.resend(' RAVI@example.com ');
    await api.revoke('inv-1');
    expect(invoke.mock.calls[0][1].body).toEqual({ action: 'resend', email: 'ravi@example.com' });
    expect(invoke.mock.calls[1][1].body).toEqual({ action: 'revoke', invitationId: 'inv-1' });
  });
  it('explains a pending duplicate invitation instead of sending another email', async () => {
    const { api, invoke } = setup(null);
    invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ code: 'invitation_pending' }), { status: 409 }) } } as never);
    await expect(api.invite({ fullName: 'Ravi', email: 'ravi@example.com', role: 'coach' })).rejects.toThrow('already pending');
  });
  it('sends the required reason with an access change', async () => {
    const { api, invoke } = setup({ message: 'User access updated.' });
    await api.update('u1', 'coach', 'active', '  Promoted to coach  ');
    expect(invoke.mock.calls[0][1].body).toEqual({
      action: 'update',
      userId: 'u1',
      role: 'coach',
      status: 'active',
      reason: 'Promoted to coach',
    });
  });
  it('maps the reason-required provider code', async () => {
    const { api, invoke } = setup(null);
    invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ code: 'reason_required' }), { status: 400 }) } } as never);
    await expect(api.update('u1', 'coach', 'active', '')).rejects.toThrow('short reason');
  });
  it('loads the user-management audit page with paging', async () => {
    const result = {
      rows: [{ id: 1, action: 'user_access_updated', actor_name: 'Admin One', target_name: 'Ravi' }],
      total: 1,
      page: 2,
      pageSize: 5,
    };
    const { api, invoke } = setup(result);
    expect(await api.audit(2, 5)).toEqual(result);
    expect(invoke).toHaveBeenCalledWith('admin-manage-users', { body: { action: 'audit', page: 2, pageSize: 5 } });
  });
  it('rejects legacy audit responses that omit pagination metadata', async () => {
    const { api } = setup({ rows: [] });
    await expect(api.audit(1, 5)).rejects.toThrow();
  });
  it('creates an invitation link with normalized details and no email dependency', async () => {
    const link = {
      invitationId: 'inv-1',
      userId: 'u1',
      actionLink: 'https://project.supabase.co/auth/v1/verify?token=abc&type=invite',
      expiresAt: '2026-11-18T00:00:00Z',
    };
    const { api, invoke } = setup(link);
    expect(
      await api.inviteLink({
        fullName: ' Ravi ',
        email: 'RAVI@example.com',
        phone: ' 1234567890 ',
        role: 'coach',
      }),
    ).toEqual(link);
    expect(invoke.mock.calls[0][1].body).toEqual({
      action: 'link',
      fullName: 'Ravi',
      email: 'ravi@example.com',
      phone: '1234567890',
      role: 'coach',
    });
  });
  it('accepts an HTTP link only for localhost development', async () => {
    const link = {
      invitationId: 'inv-1',
      userId: 'u1',
      actionLink: 'http://localhost:54321/auth/v1/verify?token=abc&type=invite',
      expiresAt: '2026-11-18T00:00:00Z',
    };
    const { api } = setup(link);
    expect(
      await api.inviteLink({ fullName: 'Ravi', email: 'ravi@example.com', role: 'coach' }),
    ).toEqual(link);
  });
  it('rejects an invitation-link response that is not a secure link', async () => {
    const { api } = setup({
      invitationId: 'inv-1',
      userId: 'u1',
      actionLink: 'javascript:alert(1)',
      expiresAt: '2026-11-18T00:00:00Z',
    });
    await expect(
      api.inviteLink({ fullName: 'Ravi', email: 'ravi@example.com', role: 'coach' }),
    ).rejects.toThrow('invalid response');
  });
  it('maps a link-generation provider failure', async () => {
    const { api, invoke } = setup(null);
    invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(JSON.stringify({ code: 'invite_link_failed' }), { status: 502 }),
      },
    } as never);
    await expect(
      api.inviteLink({ fullName: 'Ravi', email: 'ravi@example.com', role: 'coach' }),
    ).rejects.toThrow('could not be created');
  });
});
