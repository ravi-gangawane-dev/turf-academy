import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UserManagementService } from '../../core/auth/user-management.service';
import { RoleCatalogService } from '../../core/auth/role-catalog.service';
import { FALLBACK_ROLE_CATALOG } from '../../core/auth/permissions';
import { ToastService } from '../../shared/toast/toast.service';
import { UsersSettingsPanel } from './users-settings-panel';

function authStub(id = 'caller') {
  return {
    profile: signal({ id, fullName: 'Signed-in Admin', email: 'admin@example.com', role: 'admin', status: 'active' })
      .asReadonly(),
  };
}

function roleCatalogStub() {
  return {
    roles: signal(FALLBACK_ROLE_CATALOG.roles).asReadonly(),
    permissions: signal(FALLBACK_ROLE_CATALOG.permissions).asReadonly(),
    matrix: signal(FALLBACK_ROLE_CATALOG.matrix).asReadonly(),
    roleOptions: signal(
      FALLBACK_ROLE_CATALOG.roles.map((role) => ({ value: role.key, label: role.label })),
    ).asReadonly(),
    roleLabel: (role: string) =>
      FALLBACK_ROLE_CATALOG.roles.find((entry) => entry.key === role)?.label ?? role,
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
      list: vi.fn().mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 5 }),
      invite: vi.fn().mockResolvedValue(undefined),
      audit: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 5 }),
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: UserManagementService, useValue: api }, { provide: RoleCatalogService, useValue: roleCatalogStub() }, { provide: AuthService, useValue: authStub() }] });
    const fixture = TestBed.createComponent(UsersSettingsPanel);
    const toast = vi.spyOn(TestBed.inject(ToastService), 'error').mockImplementation(() => undefined);
    const page = fixture.componentInstance;
    page['inviteOpen'].set(true);
    page['form'].patchValue({ fullName: ' Ravi ', email: 'RAVI@example.com', phone: '1234567890', role: 'admin' });
    fixture.detectChanges();
    return { fixture, page, api, toast };
  }
  it('reports server failures, keeps the dialog open, and preserves the form', async () => {
    const { page, api, toast } = setup(); api.invite.mockRejectedValue(new Error('Email delivery is unavailable.'));
    await page['invite']();
    expect(toast).toHaveBeenCalledWith('Email delivery is unavailable.');
    expect(page['inviteOpen']()).toBe(true);
    expect(page['saving']()).toBe(false);
    expect(page['form'].getRawValue()).toMatchObject({ fullName: 'Ravi', email: 'ravi@example.com', phone: '1234567890', role: 'admin' });
  });
  it('normalizes details, submits once, and closes only after success', async () => {
    const { page, api } = setup(); let done!: () => void;
    api.invite.mockImplementation(() => new Promise<void>(resolve => done = resolve));
    const first = page['invite'](); await page['invite']();
    expect(api.invite).toHaveBeenCalledTimes(1);
    expect(api.invite).toHaveBeenCalledWith({ fullName: 'Ravi', email: 'ravi@example.com', phone: '1234567890', role: 'admin' });
    expect(page['inviteOpen']()).toBe(true);
    done(); await first;
    expect(page['inviteOpen']()).toBe(false);
  });
  it('submits by clicking Send Invitation and reports failures via toast', async () => {
    const { fixture, page, api, toast } = setup();
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
    const user = {
      id: 'u1', full_name: 'Ravi', email: 'ravi@example.com', phone: null, role: 'coach', status: 'active', created_at: '2026-01-01',
      invitation: { id: 'inv-1', email: 'ravi@example.com', role: 'coach', status: 'pending', invited_at: '2026-01-01', expires_at: '2026-01-08' }
    };
    const api = { list: vi.fn().mockResolvedValue({ users: [user], total: 1, page: 1, pageSize: 5 }), invite: vi.fn(), resend: vi.fn().mockResolvedValue(undefined), revoke: vi.fn().mockResolvedValue(undefined), audit: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 5 }) };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: UserManagementService, useValue: api }, { provide: RoleCatalogService, useValue: roleCatalogStub() }, { provide: AuthService, useValue: authStub() }] });
    const toast = vi.spyOn(TestBed.inject(ToastService), 'success').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(UsersSettingsPanel);
    fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    const actions = fixture.nativeElement.querySelectorAll('.row-actions button.app-button');
    expect(actions.length).toBe(5);
    expect(fixture.nativeElement.querySelector('app-status-badge').textContent).toContain('pending');
    expect(fixture.nativeElement.querySelector('.user-avatar').textContent).toBe('R');
    expect(fixture.nativeElement.querySelector('.user-identity strong').textContent).toBe('Ravi');
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
      create: vi.fn().mockResolvedValue({
        userId: 'created-1',
        email: 'new@example.com',
        role: 'coach',
        temporaryPassword: 'Abcd1234!Efgh5678',
      }),
      update: vi.fn().mockResolvedValue(undefined),
      audit: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 5 }),
      ...overrides,
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: UserManagementService, useValue: api }, { provide: RoleCatalogService, useValue: roleCatalogStub() }, { provide: AuthService, useValue: authStub() }] });
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
    const statusSelect = context.fixture.nativeElement.querySelector(
      '.users-table tbody select[aria-label^="Account status for"]',
    ) as HTMLSelectElement;
    return { ...context, roleSelect, statusSelect };
  }

  function changeRole(fixture: import('@angular/core/testing').ComponentFixture<UsersSettingsPanel>, select: HTMLSelectElement, role: string) {
    select.value = role;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function changeStatus(fixture: import('@angular/core/testing').ComponentFixture<UsersSettingsPanel>, select: HTMLSelectElement, status: string) {
    select.value = status;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('opens the confirmation dialog without writing when a role changes', async () => {
    const { fixture, page, api, roleSelect, statusSelect } = await renderWithUser();
    expect(roleSelect.value).toBe('receptionist');
    expect(statusSelect.value).toBe('active');
    changeRole(fixture, roleSelect, 'coach');

    expect(api.update).not.toHaveBeenCalled();
    expect(page['pendingAccess']()).toMatchObject({ role: 'coach', status: 'active' });
    expect(fixture.nativeElement.querySelector('#access-dialog-title')?.textContent).toContain('Confirm access change');
    const diff = fixture.nativeElement.querySelector('.access-diff')?.textContent;
    expect(diff).toContain('Receptionist');
    expect(diff).toContain('Coach');
    expect(fixture.nativeElement.querySelector('.access-effect')?.textContent).toContain(
      'Sign-in access stays the same',
    );
    expect(fixture.nativeElement.querySelector('.account-policy-note')?.textContent).toContain(
      'Deactivation keeps history',
    );
  });

  it('explains the retention effect before an account is disabled', async () => {
    const { fixture, page, statusSelect } = await renderWithUser();
    changeStatus(fixture, statusSelect, 'inactive');

    expect(page['pendingAccess']()).toMatchObject({ role: 'receptionist', status: 'inactive' });
    const diff = fixture.nativeElement.querySelector('.access-diff')?.textContent;
    expect(diff).toContain('Active');
    expect(diff).toContain('Disabled');
    const effect = fixture.nativeElement.querySelector('.access-effect');
    expect(effect.classList).toContain('blocking');
    expect(effect.textContent).toContain('Sign-in is blocked immediately');
    expect(effect.textContent).toContain('can be re-enabled later');
    expect(fixture.nativeElement.querySelector('.access-policy')?.textContent).toContain(
      'does not remove historical records',
    );
  });

  it('explains suspension before access is withdrawn', async () => {
    const { fixture, page, statusSelect } = await renderWithUser();
    changeStatus(fixture, statusSelect, 'suspended');

    expect(page['pendingAccess']()).toMatchObject({ role: 'receptionist', status: 'suspended' });
    const effect = fixture.nativeElement.querySelector('.access-effect');
    expect(effect.classList).toContain('blocking');
    expect(effect.textContent).toContain('while the issue is reviewed');
    expect(effect.textContent).toContain('reinstated later');
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
        { provide: AuthService, useValue: authStub() },
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
    expect(actions.length).toBe(5);
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

describe('UsersSettingsPanel account deletion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  const managedUser = {
    id: 'u1',
    full_name: 'Ravi',
    email: 'ravi@example.com',
    phone: null,
    role: 'coach' as const,
    status: 'active' as const,
    created_at: '2026-01-01',
  };

  function setup(overrides: Record<string, unknown> = {}, signedInId = 'caller') {
    const api = {
      list: vi.fn().mockResolvedValue({ users: [managedUser], total: 1, page: 1, pageSize: 5 }),
      invite: vi.fn(),
      resend: vi.fn(),
      revoke: vi.fn(),
      create: vi.fn().mockResolvedValue({
        userId: 'created-1',
        email: 'new@example.com',
        role: 'coach',
        temporaryPassword: 'Abcd1234!Efgh5678',
      }),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      audit: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 5 }),
      ...overrides,
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UserManagementService, useValue: api },
        { provide: RoleCatalogService, useValue: roleCatalogStub() },
        { provide: AuthService, useValue: authStub(signedInId) },
      ],
    });
    const success = vi.spyOn(TestBed.inject(ToastService), 'success').mockImplementation(() => undefined);
    const error = vi.spyOn(TestBed.inject(ToastService), 'error').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(UsersSettingsPanel);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, api, success, error };
  }

  async function render(overrides: Record<string, unknown> = {}, signedInId = 'caller') {
    const context = setup(overrides, signedInId);
    await context.fixture.whenStable();
    context.fixture.detectChanges();
    const deleteButton = context.fixture.nativeElement.querySelector(
      '.row-actions button.danger',
    ) as HTMLButtonElement | null;
    return { ...context, deleteButton };
  }

  it('does not offer deletion for the signed-in account', async () => {
    const { deleteButton, page } = await render({}, 'u1');
    expect(deleteButton).toBeNull();
    expect(page['canDelete'](managedUser)).toBe(false);
  });

  it('requires both a reason and the irreversible confirmation', async () => {
    const { fixture, page, deleteButton } = await render();
    expect(deleteButton).not.toBeNull();
    deleteButton!.click();
    fixture.detectChanges();

    expect(page['deleteTarget']()).toMatchObject({ id: 'u1' });
    expect(fixture.nativeElement.querySelector('#delete-dialog-title')?.textContent).toContain(
      'Delete user account',
    );
    expect(fixture.nativeElement.querySelector('.delete-effect')?.textContent).toContain(
      'Only accounts with no linked history',
    );

    const confirm = fixture.nativeElement.querySelector(
      '.delete-dialog footer button.danger',
    ) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    page['deleteForm'].controls.reason.setValue('Duplicate account');
    fixture.detectChanges();
    expect(confirm.disabled).toBe(true);
    page['deleteForm'].controls.confirm.setValue(true);
    fixture.detectChanges();
    expect(confirm.disabled).toBe(false);
  });

  it('deletes a no-history account and reloads users and access history', async () => {
    const { fixture, page, api, success } = await render();
    page['openDelete'](managedUser);
    fixture.detectChanges();
    page['deleteForm'].patchValue({ reason: ' Duplicate account ', confirm: true });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.delete-dialog footer button.danger') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.delete).toHaveBeenCalledWith('u1', 'Duplicate account');
    expect(success).toHaveBeenCalledWith('Ravi was deleted.');
    expect(page['deleteTarget']()).toBeNull();
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(api.audit).toHaveBeenCalledTimes(2);
  });

  it('keeps the dialog open and offers the reversible action when history blocks deletion', async () => {
    const { fixture, page, error } = await render({
      delete: vi.fn().mockRejectedValue(
        new Error(
          'This account is linked to payments, so it cannot be deleted. Disable it instead to keep the history.',
        ),
      ),
    });
    page['openDelete'](managedUser);
    fixture.detectChanges();
    page['deleteForm'].patchValue({ reason: 'Duplicate account', confirm: true });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.delete-dialog footer button.danger') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page['deleteTarget']()).not.toBeNull();
    expect(page['deleteError']()).toContain('linked to payments');
    expect(fixture.nativeElement.querySelector('.delete-dialog .notice.error')?.textContent).toContain(
      'linked to payments',
    );
    expect(error).not.toHaveBeenCalled();

    const buttons = fixture.nativeElement.querySelectorAll('.delete-dialog footer button');
    (buttons[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(page['deleteTarget']()).toBeNull();
    expect(page['pendingAccess']()).toMatchObject({ role: 'coach', status: 'inactive' });
    expect(page['accessForm'].controls.reason.value).toBe('Duplicate account');
    expect(fixture.nativeElement.querySelector('#access-dialog-title')?.textContent).toContain(
      'Confirm access change',
    );
  });
});

describe('UsersSettingsPanel direct account creation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  function setup(overrides: Record<string, unknown> = {}) {
    const api = {
      list: vi.fn().mockResolvedValue({ users: [], total: 0, page: 1, pageSize: 5 }),
      invite: vi.fn(),
      resend: vi.fn(),
      revoke: vi.fn(),
      create: vi.fn().mockResolvedValue({
        userId: 'created-1',
        email: 'new@example.com',
        role: 'coach',
        temporaryPassword: 'Abcd1234!Efgh5678',
      }),
      update: vi.fn(),
      delete: vi.fn(),
      audit: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 5 }),
      ...overrides,
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UserManagementService, useValue: api },
        { provide: RoleCatalogService, useValue: roleCatalogStub() },
        { provide: AuthService, useValue: authStub() },
      ],
    });
    const success = vi.spyOn(TestBed.inject(ToastService), 'success').mockImplementation(() => undefined);
    const error = vi.spyOn(TestBed.inject(ToastService), 'error').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(UsersSettingsPanel);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, api, success, error };
  }

  function createButton(fixture: ReturnType<typeof TestBed.createComponent>): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.create-user-button') as HTMLButtonElement;
  }

  it('opens the create dialog from the header', () => {
    const { fixture } = setup();
    createButton(fixture).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#create-dialog-title')?.textContent).toContain(
      'Create user account',
    );
    expect(fixture.nativeElement.querySelector('.create-user-dialog .delete-effect')?.textContent).toContain(
      'must choose a new password',
    );
  });

  it('creates the account and shows the temporary password once', async () => {
    const { fixture, page, api, success } = setup();
    page['createOpen'].set(true);
    fixture.detectChanges();
    page['createForm'].patchValue({
      fullName: ' New Coach ',
      email: 'NEW@Example.com',
      phone: ' 999 ',
      role: 'coach',
    });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.create-user-dialog footer button.primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.create).toHaveBeenCalledWith({
      fullName: 'New Coach',
      email: 'new@example.com',
      phone: '999',
      role: 'coach',
    });
    expect(page['createOpen']()).toBe(false);
    expect(page['createdUser']()).toMatchObject({ email: 'new@example.com' });
    expect(success).toHaveBeenCalledWith(
      'new@example.com was created. Share the temporary password privately.',
    );
    expect(fixture.nativeElement.querySelector('#created-user-title')?.textContent).toContain(
      'Account created',
    );
    const password = fixture.nativeElement.querySelector(
      '.credential-dialog input[aria-label="Temporary password"]',
    ) as HTMLInputElement;
    expect(password.value).toBe('Abcd1234!Efgh5678');
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('keeps the dialog open with an inline error when creation fails', async () => {
    const { fixture, page, error } = setup({
      create: vi.fn().mockRejectedValue(new Error('This email address is not accepted.')),
    });
    page['createOpen'].set(true);
    fixture.detectChanges();
    page['createForm'].patchValue({
      fullName: 'New Coach',
      email: 'new@example.com',
      phone: '',
      role: 'coach',
    });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.create-user-dialog footer button.primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page['createOpen']()).toBe(true);
    expect(page['createdUser']()).toBeNull();
    expect(page['createError']()).toContain('not accepted');
    expect(fixture.nativeElement.querySelector('.create-user-dialog .notice.error')?.textContent).toContain(
      'not accepted',
    );
    expect(error).toHaveBeenCalledWith('This email address is not accepted.');
  });

  it('blocks submission until the required fields are valid', () => {
    const { fixture, page } = setup();
    page['createOpen'].set(true);
    fixture.detectChanges();
    const submit = fixture.nativeElement.querySelector(
      '.create-user-dialog footer button.primary',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    page['createForm'].patchValue({ fullName: 'New Coach', email: 'new@example.com', role: 'coach' });
    fixture.detectChanges();
    expect(submit.disabled).toBe(false);
  });
});

describe('UsersSettingsPanel permission overrides', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  const managedUser = {
    id: 'u1',
    full_name: 'Ravi',
    email: 'ravi@example.com',
    phone: null,
    role: 'coach' as const,
    status: 'active' as const,
    created_at: '2026-01-01',
  };

  function setup(overrides: Record<string, unknown> = {}) {
    const api = {
      list: vi.fn().mockResolvedValue({ users: [managedUser], total: 1, page: 1, pageSize: 5 }),
      invite: vi.fn(),
      resend: vi.fn(),
      revoke: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      permissions: vi.fn().mockResolvedValue({ userId: 'u1', role: 'coach', overrides: [] }),
      setPermissions: vi.fn().mockResolvedValue(undefined),
      audit: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 5 }),
      ...overrides,
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UserManagementService, useValue: api },
        { provide: RoleCatalogService, useValue: roleCatalogStub() },
        { provide: AuthService, useValue: authStub() },
      ],
    });
    const success = vi.spyOn(TestBed.inject(ToastService), 'success').mockImplementation(() => undefined);
    const error = vi.spyOn(TestBed.inject(ToastService), 'error').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(UsersSettingsPanel);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, api, success, error };
  }

  async function render(overrides: Record<string, unknown> = {}) {
    const context = setup(overrides);
    await context.fixture.whenStable();
    context.fixture.detectChanges();
    return context;
  }

  it('opens the override editor with role defaults and existing changes', async () => {
    const { fixture, page, api } = await render({
      permissions: vi.fn().mockResolvedValue({
        userId: 'u1',
        role: 'coach',
        overrides: [{ permissionKey: 'students:read', effect: 'grant' }],
      }),
    });
    const button = fixture.nativeElement.querySelector(
      '.row-actions button[aria-label="Permissions for Ravi"]',
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.permissions).toHaveBeenCalledWith('u1');
    expect(page['permissionsTarget']()).toMatchObject({ id: 'u1' });
    expect(fixture.nativeElement.querySelector('#permissions-dialog-title')?.textContent).toContain(
      'Permission overrides',
    );
    expect(fixture.nativeElement.querySelector('.permissions-dialog')?.textContent).toContain(
      'Database row security still follows',
    );
    expect(fixture.nativeElement.querySelectorAll('.permission-group').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('.permission-count')?.textContent).toContain(
      '1 override selected',
    );
  });

  it('saves grants and revokes with a reason and reloads access history', async () => {
    const { fixture, page, api, success } = await render();
    await page['openPermissions'](managedUser);
    fixture.detectChanges();
    page['setPermissionEffect']('students:read', 'grant');
    page['setPermissionEffect']('reports:read', 'revoke');
    fixture.detectChanges();
    page['permissionForm'].controls.reason.setValue(' Cover reception ');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.permissions-dialog footer button.primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.setPermissions).toHaveBeenCalledWith(
      'u1',
      [
        { permissionKey: 'students:read', effect: 'grant' },
        { permissionKey: 'reports:read', effect: 'revoke' },
      ],
      'Cover reception',
    );
    expect(success).toHaveBeenCalledWith('Permissions updated for Ravi.');
    expect(page['permissionsTarget']()).toBeNull();
    expect(api.audit).toHaveBeenCalledTimes(2);
  });

  it('restores the role default when an override is set back to default', async () => {
    const { fixture, page } = await render();
    await page['openPermissions'](managedUser);
    fixture.detectChanges();
    page['setPermissionEffect']('students:read', 'grant');
    expect(page['permissionChangeCount']()).toBe(1);
    page['setPermissionEffect']('students:read', 'default');
    fixture.detectChanges();
    expect(page['permissionChangeCount']()).toBe(0);
    expect(fixture.nativeElement.querySelector('.permission-count')?.textContent).toContain(
      '0 overrides selected',
    );
  });

  it('requires a reason before saving an override set', async () => {
    const { fixture, page, api } = await render();
    await page['openPermissions'](managedUser);
    fixture.detectChanges();
    page['setPermissionEffect']('students:read', 'grant');
    fixture.detectChanges();
    const save = fixture.nativeElement.querySelector(
      '.permissions-dialog footer button.primary',
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    page['permissionForm'].controls.reason.setValue('ab');
    fixture.detectChanges();
    expect(save.disabled).toBe(true);
    page['permissionForm'].controls.reason.setValue('Cover reception');
    fixture.detectChanges();
    expect(save.disabled).toBe(false);
    expect(api.setPermissions).not.toHaveBeenCalled();
  });

  it('keeps the editor open with an error when overrides cannot be loaded', async () => {
    const { fixture, page, api } = await render({
      permissions: vi.fn().mockRejectedValue(new Error('Permission overrides are unavailable.')),
    });
    await page['openPermissions'](managedUser);
    fixture.detectChanges();

    expect(page['permissionsLoaded']()).toBe(false);
    expect(page['permissionsError']()).toContain('unavailable');
    expect(fixture.nativeElement.querySelector('.permissions-dialog .notice.error')?.textContent).toContain(
      'unavailable',
    );
    const save = fixture.nativeElement.querySelector(
      '.permissions-dialog footer button.primary',
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(api.setPermissions).not.toHaveBeenCalled();
  });

  it('shows a server guard message without closing the editor', async () => {
    const { fixture, page, error } = await render({
      setPermissions: vi
        .fn()
        .mockRejectedValue(new Error('You cannot remove your own settings access. Ask another administrator.')),
    });
    await page['openPermissions'](managedUser);
    fixture.detectChanges();
    page['setPermissionEffect']('settings:write', 'revoke');
    page['permissionForm'].controls.reason.setValue('Remove settings');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.permissions-dialog footer button.primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page['permissionsTarget']()).not.toBeNull();
    expect(page['permissionsError']()).toContain('cannot remove your own settings access');
    expect(error).not.toHaveBeenCalled();
  });

  it('summarises a permission change using catalogue labels', () => {
    const { page } = setup();
    const summary = page['accessSummary']({
      id: 1,
      action: 'user_permissions_changed',
      table_name: 'profiles',
      record_id: 'u1',
      occurred_at: '',
      actor_id: null,
      actor_name: 'Admin',
      target_name: 'Ravi',
      old_values: {},
      new_values: {
        after: [
          { permissionKey: 'students:read', effect: 'grant' },
          { permissionKey: 'settings:write', effect: 'revoke' },
        ],
      },
    });
    expect(summary).toContain('View students granted');
    expect(summary).toContain('Manage settings revoked');
  });

  it('summarises clearing every override', () => {
    const { page } = setup();
    const summary = page['accessSummary']({
      id: 2,
      action: 'user_permissions_changed',
      table_name: 'profiles',
      record_id: 'u1',
      occurred_at: '',
      actor_id: null,
      actor_name: 'Admin',
      target_name: 'Ravi',
      old_values: {},
      new_values: { after: [] },
    });
    expect(summary).toContain('role defaults restored');
  });
});
