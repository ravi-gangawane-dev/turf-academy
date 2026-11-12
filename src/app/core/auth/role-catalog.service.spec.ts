import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../config/api.config';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { RoleCatalogService } from './role-catalog.service';
import { FALLBACK_ROLE_CATALOG } from './permissions';

function rowsClient(tables: Record<string, { data: unknown[] | null; error: { message: string } | null }>) {
  return {
    from: vi.fn((table: string) => {
      const result = tables[table] ?? { data: null, error: null };
      const query = {
        select: () => query,
        order: () => query,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    }),
  };
}

function setup(client: unknown) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: API_CONFIG,
        useValue: { baseUrl: '/api/v1', useMockApi: false, backend: 'supabase' },
      },
      { provide: SupabaseClientService, useValue: { requireClient: () => client } },
    ],
  });
  return TestBed.inject(RoleCatalogService);
}

const backendRows = {
  roles: {
    data: [
      { key: 'parent', label: 'Guardian', description: 'Family access', rank: 40, is_staff: false },
      { key: 'admin', label: 'Administrator', description: 'Everything', rank: 10, is_staff: true },
      { key: 'coach', label: 'Coach', description: 'Assigned batches', rank: 30, is_staff: true },
      { key: 'receptionist', label: 'Receptionist', description: 'Front desk', rank: 20, is_staff: true },
    ],
    error: null,
  },
  permissions: {
    data: [
      { key: 'settings:write', label: 'Manage settings', description: 'All settings', area: 'Settings' },
      { key: 'students:read', label: 'View students', description: 'Student profiles', area: 'Students' },
      { key: 'coach:portal', label: 'Coach portal', description: 'Coach workspace', area: 'Portal' },
      { key: 'children:read', label: 'Own children', description: 'Guardian view', area: 'Portal' },
    ],
    error: null,
  },
  role_permissions: {
    data: [
      { role_key: 'admin', permission_key: 'settings:write' },
      { role_key: 'admin', permission_key: 'students:read' },
      { role_key: 'receptionist', permission_key: 'students:read' },
      { role_key: 'coach', permission_key: 'coach:portal' },
      { role_key: 'parent', permission_key: 'children:read' },
    ],
    error: null,
  },
};

describe('RoleCatalogService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('reads roles, permissions and the matrix from the database', async () => {
    const client = rowsClient(backendRows);
    const service = setup(client);

    const catalog = await service.load();

    expect(service.source()).toBe('backend');
    expect(service.error()).toBe('');
    expect(catalog.roles.map((role) => role.key)).toEqual(['admin', 'receptionist', 'coach', 'parent']);
    expect(catalog.roles[3]).toMatchObject({ label: 'Guardian', isStaff: false });
    expect(service.roleOptions()).toEqual([
      { value: 'admin', label: 'Administrator' },
      { value: 'receptionist', label: 'Receptionist' },
      { value: 'coach', label: 'Coach' },
      { value: 'parent', label: 'Guardian' },
    ]);
    expect(service.permissionsFor('admin')).toEqual(['settings:write', 'students:read']);
    expect(service.permissionLabel('settings:write')).toBe('Manage settings');
    expect(client.from).toHaveBeenCalledWith('roles');
    expect(client.from).toHaveBeenCalledWith('role_permissions');
  });

  it('keeps the reviewed matrix when the catalogue tables are unavailable', async () => {
    const client = rowsClient({
      roles: { data: null, error: { message: 'relation "roles" does not exist' } },
      permissions: { data: null, error: { message: 'relation "permissions" does not exist' } },
      role_permissions: { data: null, error: { message: 'relation "role_permissions" does not exist' } },
    });
    const service = setup(client);

    const catalog = await service.load();

    expect(service.source()).toBe('fallback');
    expect(service.error()).toContain('does not exist');
    expect(catalog.matrix).toEqual(FALLBACK_ROLE_CATALOG.matrix);
    expect(service.permissionsFor('receptionist')).toEqual(
      FALLBACK_ROLE_CATALOG.matrix.receptionist,
    );
  });

  it('rejects an incomplete catalogue instead of silently narrowing access', async () => {
    const client = rowsClient({
      ...backendRows,
      role_permissions: { data: [{ role_key: 'admin', permission_key: 'settings:write' }], error: null },
    });
    const service = setup(client);

    await service.load();

    expect(service.source()).toBe('fallback');
    expect(service.error()).toContain('incomplete');
    expect(service.permissionsFor('coach')).toContain('coach:portal');
  });

  it('loads the catalogue once for repeated readers and refreshes on demand', async () => {
    const client = rowsClient(backendRows);
    const service = setup(client);

    await Promise.all([service.load(), service.load()]);
    await service.load();
    expect(client.from).toHaveBeenCalledTimes(3);

    await service.load(true);
    expect(client.from).toHaveBeenCalledTimes(6);
  });
});
