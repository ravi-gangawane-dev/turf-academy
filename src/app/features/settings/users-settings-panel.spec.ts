import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { UserManagementService } from '../../core/auth/user-management.service';
import { RoleCatalogService } from '../../core/auth/role-catalog.service';
import { FALLBACK_ROLE_CATALOG } from '../../core/auth/permissions';
import { ToastService } from '../../shared/toast/toast.service';
import { UsersSettingsPanel } from './users-settings-panel';

function roleCatalogStub() {
  return {
    roles: signal(FALLBACK_ROLE_CATALOG.roles).asReadonly(),
    permissions: signal(FALLBACK_ROLE_CATALOG.permissions).asReadonly(),
    matrix: signal(FALLBACK_ROLE_CATALOG.matrix).asReadonly(),
    roleOptions: signal(
      FALLBACK_ROLE_CATALOG.roles.map((role) => ({ value: role.key, label: role.label })),
    ).asReadonly(),
    source: signal<'fallback' | 'backend'>('backend').asReadonly(),
    loading: signal(false).asReadonly(),
    error: signal('').asReadonly(),
    load: vi.fn().mockResolvedValue(FALLBACK_ROLE_CATALOG),
  };
}

describe('UsersSettingsPanel invitation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });
  function setup() {
    const api = {
      list: vi.fn().mockResolvedValue({users:[],total:0,page:1,pageSize:5}),
      invite: vi.fn().mockResolvedValue(undefined),
      audit: vi.fn().mockResolvedValue({rows:[],total:0,page:1,pageSize:5}),
    };
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:UserManagementService,useValue:api},{provide:RoleCatalogService,useValue:roleCatalogStub()}]});
    const fixture=TestBed.createComponent(UsersSettingsPanel);
    const toast = vi.spyOn(TestBed.inject(ToastService), 'error').mockImplementation(() => undefined);
    const page=fixture.componentInstance;
    page['inviteOpen'].set(true);
    page['form'].patchValue({fullName:' Ravi ',email:'RAVI@example.com',phone:'1234567890',role:'admin'});
    fixture.detectChanges();
    return {fixture,page,api,toast};
  }
  it('reports server failures, keeps the dialog open, and preserves the form', async()=>{
    const {page,api,toast}=setup(); api.invite.mockRejectedValue(new Error('Email delivery is unavailable.'));
    await page['invite']();
    expect(toast).toHaveBeenCalledWith('Email delivery is unavailable.');
    expect(page['inviteOpen']()).toBe(true);
    expect(page['saving']()).toBe(false);
    expect(page['form'].getRawValue()).toMatchObject({fullName:'Ravi',email:'ravi@example.com',phone:'1234567890',role:'admin'});
  });
  it('normalizes details, submits once, and closes only after success',async()=>{
    const {page,api}=setup(); let done!:()=>void;
    api.invite.mockImplementation(()=>new Promise<void>(resolve=>done=resolve));
    const first=page['invite'](); await page['invite']();
    expect(api.invite).toHaveBeenCalledTimes(1);
    expect(api.invite).toHaveBeenCalledWith({fullName:'Ravi',email:'ravi@example.com',phone:'1234567890',role:'admin'});
    expect(page['inviteOpen']()).toBe(true);
    done(); await first;
    expect(page['inviteOpen']()).toBe(false);
  });
  it('submits by clicking Send Invitation and reports failures via toast', async () => {
    const {fixture,page,api,toast}=setup();
    api.invite.mockRejectedValue(new Error('Invitation delivery failed.'));
    const button = fixture.nativeElement.querySelector('.dialog footer button.primary') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(api.invite).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith('Invitation delivery failed.');
    expect(page['inviteOpen']()).toBe(true);
  });
  it('shows invitation state and resends a pending invitation from the row', async () => {
    const user = { id:'u1', full_name:'Ravi', email:'ravi@example.com', phone:null, role:'coach', status:'active', created_at:'2026-01-01',
      invitation:{ id:'inv-1', email:'ravi@example.com', role:'coach', status:'pending', invited_at:'2026-01-01', expires_at:'2026-01-08' } };
    const api = { list:vi.fn().mockResolvedValue({users:[user],total:1,page:1,pageSize:5}), invite:vi.fn(), resend:vi.fn().mockResolvedValue(undefined), revoke:vi.fn().mockResolvedValue(undefined), audit:vi.fn().mockResolvedValue({rows:[],total:0,page:1,pageSize:5}) };
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:UserManagementService,useValue:api},{provide:RoleCatalogService,useValue:roleCatalogStub()}]});
    const toast = vi.spyOn(TestBed.inject(ToastService), 'success').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(UsersSettingsPanel);
    fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    const actions = fixture.nativeElement.querySelectorAll('.row-actions button.app-button');
    expect(actions.length).toBe(3);
    expect(fixture.nativeElement.querySelector('.status-chip').textContent).toContain('pending');
    actions[0].click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(api.resend).toHaveBeenCalledWith('ravi@example.com');
    expect(toast).toHaveBeenCalled();
    expect(api.list).toHaveBeenCalledTimes(2);
  });
});

describe('UsersSettingsPanel access changes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  const managedUser = {
    id: 'u1', full_name: 'Ravi', email: 'ravi@example.com', phone: null,
    role: 'receptionist', status: 'active', created_at: '2026-01-01',
  };

  function setup(overrides: Record<string, unknown> = {}) {
    const api = {
      list: vi.fn().mockResolvedValue({ users: [managedUser], total: 1, page: 1, pageSize: 5 }),
      invite: vi.fn(),
      resend: vi.fn(),
      revoke: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      audit: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 5 }),
      ...overrides,
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: UserManagementService, useValue: api }, { provide: RoleCatalogService, useValue: roleCatalogStub() }] });
    const success = vi.spyOn(TestBed.inject(ToastService), 'success').mockImplementation(() => undefined);
    const error = vi.spyOn(TestBed.inject(ToastService), 'error').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(UsersSettingsPanel);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, api, success, error };
  }

  async function renderWithUser(overrides: Record<string, unknown> = {}) {
    const context = setup(overrides);
    await context.fixture.whenStable();
    context.fixture.detectChanges();
    const roleSelect = context.fixture.nativeElement.querySelector(
      '.users-table tbody select[aria-label^="Role for"]',
    ) as HTMLSelectElement;
    return { ...context, roleSelect };
  }

  function changeRole(fixture: import('@angular/core/testing').ComponentFixture<UsersSettingsPanel>, select: HTMLSelectElement, role: string) {
    select.value = role;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('opens the confirmation dialog without writing when a role changes', async () => {
    const { fixture, page, api, roleSelect } = await renderWithUser();
    changeRole(fixture, roleSelect, 'coach');

    expect(api.update).not.toHaveBeenCalled();
    expect(page['pendingAccess']()).toMatchObject({ role: 'coach', status: 'active' });
    expect(fixture.nativeElement.querySelector('#access-dialog-title')?.textContent).toContain('Confirm access change');
    expect(fixture.nativeElement.querySelector('.access-diff')?.textContent).toContain('receptionist');
  });

  it('sends the required reason only when the change is confirmed', async () => {
    const { fixture, page, api, roleSelect, success } = await renderWithUser();
    changeRole(fixture, roleSelect, 'coach');

    const confirm = fixture.nativeElement.querySelector('.access-dialog footer button.primary') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    page['accessForm'].controls.reason.setValue('Promoted to coach');
    fixture.detectChanges();
    expect(confirm.disabled).toBe(false);

    confirm.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.update).toHaveBeenCalledWith('u1', 'coach', 'active', 'Promoted to coach');
    expect(success).toHaveBeenCalledWith('User access updated.');
    expect(page['pendingAccess']()).toBeNull();
    expect(api.audit).toHaveBeenCalledTimes(2);
  });

  it('restores the selects and skips the write when the change is cancelled', async () => {
    const { fixture, page, api, roleSelect } = await renderWithUser();
    changeRole(fixture, roleSelect, 'coach');
    expect(roleSelect.value).toBe('coach');

    const cancel = fixture.nativeElement.querySelector('.access-dialog footer button[type="button"]') as HTMLButtonElement;
    cancel.click();
    fixture.detectChanges();

    expect(roleSelect.value).toBe('receptionist');
    expect(page['pendingAccess']()).toBeNull();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and shows the server error when the update fails', async () => {
    const { fixture, page, roleSelect } = await renderWithUser({
      update: vi.fn().mockRejectedValue(new Error('At least one active administrator must remain.')),
    });
    changeRole(fixture, roleSelect, 'coach');
    page['accessForm'].controls.reason.setValue('Handover to another admin');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.access-dialog footer button.primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page['pendingAccess']()).not.toBeNull();
    expect(page['accessError']()).toContain('At least one active administrator');
    const notice = fixture.nativeElement.querySelector('.access-dialog .notice.error') as HTMLElement;
    expect(notice.textContent).toContain('At least one active administrator');
    expect(page['saving']()).toBe(false);
  });

  it('renders access history with actor, target, change and reason', async () => {
    const { fixture } = await renderWithUser({
      audit: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 2, action: 'user_access_updated', table_name: 'profiles', record_id: 'u1',
            occurred_at: '2026-11-04T10:00:00Z', actor_id: 'a1', actor_name: 'Admin One', target_name: 'Ravi',
            old_values: { role: 'receptionist', status: 'active', is_active: true },
            new_values: { role: 'coach', status: 'active', is_active: true, reason: 'Promoted to coach' },
          },
          {
            id: 1, action: 'invitation_sent', table_name: 'user_invitations', record_id: 'inv-1',
            occurred_at: '2026-11-03T10:00:00Z', actor_id: 'a1', actor_name: 'Admin One', target_name: 'new@example.com',
            old_values: null,
            new_values: { email: 'new@example.com', role: 'parent' },
          },
        ],
        total: 2, page: 1, pageSize: 5,
      }),
    });

    const rows = fixture.nativeElement.querySelectorAll('.user-history-table tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Admin One');
    expect(rows[0].textContent).toContain('Ravi');
    expect(rows[0].textContent).toContain('Role receptionist → coach');
    expect(rows[0].textContent).toContain('Promoted to coach');
    expect(rows[1].textContent).toContain('new@example.com');
    expect(rows[1].textContent).toContain('Invitation sent as parent');
  });

  it('shows access history load errors with a retry action', async () => {
    const audit = vi.fn()
      .mockRejectedValueOnce(new Error('Deploy the latest admin-manage-users function.'))
      .mockResolvedValueOnce({ rows: [], total: 0, page: 1, pageSize: 5 });
    const { fixture, page } = await renderWithUser({ audit });

    expect(page['auditError']()).toContain('Deploy the latest admin-manage-users function.');
    const retry = fixture.nativeElement.querySelector('.user-access-history .notice.error button') as HTMLButtonElement;
    retry.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page['auditError']()).toBe('');
    expect(audit).toHaveBeenCalledTimes(2);
  });
});

describe('UsersSettingsPanel invitation link fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  const link = {
    invitationId: 'inv-1',
    userId: 'u1',
    actionLink: 'https://project.supabase.co/auth/v1/verify?token=abc&type=invite',
    expiresAt: '2026-11-18T00:00:00Z',
  };

  function setup(overrides: Record<string, unknown> = {}) {
    const api = {
      list: vi.fn().mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 5 }),
      invite: vi.fn(),
      inviteLink: vi.fn().mockResolvedValue(link),
      resend: vi.fn(),
      revoke: vi.fn(),
      audit: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 5 }),
      ...overrides,
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UserManagementService, useValue: api },
        { provide: RoleCatalogService, useValue: roleCatalogStub() },
      ],
    });
    const error = vi.spyOn(TestBed.inject(ToastService), 'error').mockImplementation(() => undefined);
    const success = vi.spyOn(TestBed.inject(ToastService), 'success').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(UsersSettingsPanel);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, api, error, success };
  }

  it('creates a shareable link from the invite form and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const { fixture, page, api, success } = setup();
    page['inviteOpen'].set(true);
    page['form'].patchValue({
      fullName: ' Ravi ',
      email: 'RAVI@example.com',
      phone: '1234567890',
      role: 'admin',
    });
    fixture.detectChanges();

    await page['createInviteLink']();
    fixture.detectChanges();

    expect(api.inviteLink).toHaveBeenCalledWith({
      fullName: 'Ravi',
      email: 'ravi@example.com',
      phone: '1234567890',
      role: 'admin',
    });
    expect(page['inviteOpen']()).toBe(false);
    expect(page['linkDialog']()).toEqual(link);
    expect(fixture.nativeElement.querySelector('#invite-link-title')?.textContent).toContain(
      'Invitation link',
    );
    expect(
      (fixture.nativeElement.querySelector('.link-dialog .link-value') as HTMLInputElement).value,
    ).toBe(link.actionLink);

    (fixture.nativeElement.querySelector('.link-dialog footer button.primary') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith(link.actionLink);
    expect(page['linkCopied']()).toBe(true);
    expect(success).toHaveBeenCalledWith('Invitation link copied.');
  });

  it('keeps the invite dialog open with an inline error when link creation fails', async () => {
    const { fixture, page, error } = setup({
      inviteLink: vi.fn().mockRejectedValue(new Error('Invitation links are not configured.')),
    });
    page['inviteOpen'].set(true);
    page['form'].patchValue({ fullName: 'Ravi', email: 'ravi@example.com', phone: '', role: 'coach' });
    fixture.detectChanges();

    await page['createInviteLink']();
    fixture.detectChanges();

    expect(page['inviteOpen']()).toBe(true);
    expect(page['linkDialog']()).toBeNull();
    expect(page['error']()).toBe('Invitation links are not configured.');
    expect(fixture.nativeElement.querySelector('.dialog .notice.error')?.textContent).toContain(
      'Invitation links are not configured.',
    );
    expect(error).toHaveBeenCalledWith('Invitation links are not configured.');
  });

  it('recreates a link for a pending invitation from the row action', async () => {
    const user = {
      id: 'u1',
      full_name: 'Ravi',
      email: 'ravi@example.com',
      phone: null,
      role: 'coach',
      status: 'active',
      created_at: '2026-01-01',
      invitation: {
        id: 'inv-1',
        email: 'ravi@example.com',
        role: 'coach',
        status: 'pending',
        invited_at: '2026-01-01',
        expires_at: '2026-01-08',
      },
    };
    const { fixture, page, api } = setup({
      list: vi.fn().mockResolvedValue({ users: [user], total: 1, page: 1, pageSize: 5 }),
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const actions = fixture.nativeElement.querySelectorAll('.row-actions button.app-button');
    expect(actions.length).toBe(3);
    (actions[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.inviteLink).toHaveBeenCalledWith({
      fullName: 'Ravi',
      email: 'ravi@example.com',
      phone: undefined,
      role: 'coach',
    });
    expect(page['linkDialog']()).toEqual(link);
    expect(fixture.nativeElement.querySelector('#invite-link-title')?.textContent).toContain(
      'Invitation link',
    );
  });
});
