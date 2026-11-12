import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { FALLBACK_ROLE_CATALOG } from './permissions';
import { RoleCatalogService } from './role-catalog.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: true } },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('creates a mock staff session', async () => {
    const session = await firstValueFrom(
      service.login({ identity: 'admin@turf.local', password: 'academy123' }),
    );
    expect(session.user.role).toBe('admin');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken()).toBe('mock-access-token');
  });

  it('clears the active session on logout', async () => {
    await firstValueFrom(service.login({ identity: 'admin@turf.local', password: 'academy123' }));
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('turf-academy-session')).toBeNull();
  });

  it('applies the coach permission boundary', async () => {
    await firstValueFrom(service.login({ identity: 'coach@turf.local', password: 'academy123' }));
    expect(service.hasPermission('coach:portal')).toBe(true);
    expect(service.hasPermission('attendance:write')).toBe(false);
    expect(service.hasPermission('students:read')).toBe(false);
    expect(service.hasPermission('students:write')).toBe(false);
    expect(service.hasPermission('coaches:write')).toBe(false);
    expect(service.hasPermission('fees:write')).toBe(false);
    expect(service.hasPermission('reports:read')).toBe(false);
  });

  it('separates parent child access from student management', async () => {
    await firstValueFrom(service.login({ identity: 'parent@turf.local', password: 'academy123' }));
    expect(service.hasPermission('children:read')).toBe(true);
    expect(service.hasPermission('students:read')).toBe(false);
    expect(service.hasPermission('students:write')).toBe(false);
    expect(service.hasPermission('attendance:write')).toBe(false);
    expect(service.hasPermission('fees:write')).toBe(false);
  });
});

describe('AuthService session revalidation', () => {
  const activeProfile = {
    id: 'u1', full_name: 'Ravi Admin', email: 'ravi@example.com', phone: null,
    avatar_url: null, role: 'admin', status: 'active', is_active: true,
  };

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  function clientWith(profiles: { data: unknown; error: unknown }[]) {
    let index = 0;
    const query: Record<string, unknown> = {};
    query['select'] = () => query;
    query['eq'] = () => query;
    query['maybeSingle'] = () =>
      Promise.resolve(profiles[Math.min(index++, profiles.length - 1)]);
    const session = { access_token: 'token', user: { id: 'u1' } };
    const auth = {
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    };
    return { auth, from: vi.fn(() => query), session };
  }

  function setup(client: ReturnType<typeof clientWith>) {
    const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: false, backend: 'supabase' } },
        { provide: SupabaseClientService, useValue: { client, requireClient: () => client } },
        {
          provide: RoleCatalogService,
          useValue: {
            matrix: signal(FALLBACK_ROLE_CATALOG.matrix).asReadonly(),
            load: vi.fn().mockResolvedValue(FALLBACK_ROLE_CATALOG),
          },
        },
        { provide: Router, useValue: router },
      ],
    });
    return { service: TestBed.inject(AuthService), router };
  }

  it('signs out an open session when the account is suspended', async () => {
    const client = clientWith([
      { data: activeProfile, error: null },
      { data: { ...activeProfile, status: 'suspended' }, error: null },
    ]);
    const { service, router } = setup(client);

    await service.ensureInitialized();
    expect(service.isAuthenticated()).toBe(true);

    await expect(service.checkSession()).resolves.toBe(false);

    expect(service.isAuthenticated()).toBe(false);
    expect(service.sessionEndReason()).toBe('suspended');
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(router.navigateByUrl).toHaveBeenCalledWith(
      '/auth/session-expired?reason=suspended',
      { replaceUrl: true },
    );
  });

  it('signs out when the profile is disabled or removed', async () => {
    const disabled = clientWith([
      { data: activeProfile, error: null },
      { data: { ...activeProfile, status: 'inactive', is_active: false }, error: null },
    ]);
    const disabledSetup = setup(disabled);
    await disabledSetup.service.ensureInitialized();
    await expect(disabledSetup.service.checkSession()).resolves.toBe(false);
    expect(disabledSetup.service.sessionEndReason()).toBe('inactive');

    TestBed.resetTestingModule();

    const removed = clientWith([
      { data: activeProfile, error: null },
      { data: null, error: { message: 'no rows' } },
    ]);
    const removedSetup = setup(removed);
    await removedSetup.service.ensureInitialized();
    await expect(removedSetup.service.checkSession()).resolves.toBe(false);
    expect(removedSetup.service.sessionEndReason()).toBe('removed');
    expect(removedSetup.router.navigateByUrl).toHaveBeenCalledWith(
      '/auth/session-expired?reason=removed',
      { replaceUrl: true },
    );
  });

  it('adopts a role change without forcing the user to sign in again', async () => {
    const client = clientWith([
      { data: activeProfile, error: null },
      { data: { ...activeProfile, role: 'coach' }, error: null },
    ]);
    const { service, router } = setup(client);

    await service.ensureInitialized();
    await expect(service.checkSession()).resolves.toBe(true);

    expect(service.role()).toBe('coach');
    expect(service.hasPermission('coach:portal')).toBe(true);
    expect(service.hasPermission('settings:write')).toBe(false);
    expect(client.auth.signOut).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('keeps the session through a transient network failure', async () => {
    const client = clientWith([{ data: activeProfile, error: null }]);
    const { service, router } = setup(client);
    await service.ensureInitialized();
    client.auth.getSession.mockRejectedValueOnce(new Error('network down'));

    await expect(service.checkSession()).resolves.toBe(true);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.sessionEndReason()).toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
