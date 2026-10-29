import { Permission, ROLE_PERMISSIONS } from './permissions';
import { StaffRole } from './auth.model';

const ALL_PERMISSIONS: readonly Permission[] = [
  'coach:portal',
  'children:read',
  'students:read',
  'students:write',
  'parents:read',
  'parents:write',
  'coaches:read',
  'coaches:write',
  'batches:read',
  'batches:write',
  'enrollments:write',
  'attendance:read',
  'attendance:write',
  'fees:write',
  'notifications:read',
  'reports:read',
  'settings:write',
];

const ALL_ROLES: readonly StaffRole[] = ['admin', 'coach', 'receptionist', 'parent'];

/** Permissions that belong to a single role: the coach portal and the parent child view. */
const ROLE_SCOPED_PERMISSIONS: readonly Permission[] = ['coach:portal', 'children:read'];

describe('ROLE_PERMISSIONS', () => {
  it('grants administrators every academy-operations permission', () => {
    const operational = ALL_PERMISSIONS.filter(permission => !ROLE_SCOPED_PERMISSIONS.includes(permission));
    expect([...ROLE_PERMISSIONS.admin].sort()).toEqual([...operational].sort());
  });

  it('keeps the coach portal and the parent child view role scoped', () => {
    for (const permission of ROLE_SCOPED_PERMISSIONS) {
      expect(ROLE_PERMISSIONS.admin).not.toContain(permission);
      expect(ROLE_PERMISSIONS.receptionist).not.toContain(permission);
    }
  });

  it('limits coaches to the coach portal', () => {
    expect(ROLE_PERMISSIONS.coach).toEqual(['coach:portal']);
  });

  it('limits parents to reading their own children', () => {
    expect(ROLE_PERMISSIONS.parent).toEqual(['children:read']);
  });

  it('gives reception operational access without settings or reporting', () => {
    expect(ROLE_PERMISSIONS.receptionist).toContain('students:write');
    expect(ROLE_PERMISSIONS.receptionist).toContain('attendance:write');
    expect(ROLE_PERMISSIONS.receptionist).not.toContain('settings:write');
    expect(ROLE_PERMISSIONS.receptionist).not.toContain('reports:read');
    expect(ROLE_PERMISSIONS.receptionist).not.toContain('coaches:write');
  });

  it('defines a permission list for every staff role and no unknown entries', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual([...ALL_ROLES].sort());
    for (const role of ALL_ROLES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(ALL_PERMISSIONS).toContain(permission);
      }
    }
  });

  it('never grants a coach or a parent academy-wide read access', () => {
    expect(ROLE_PERMISSIONS.coach).not.toContain('students:read');
    expect(ROLE_PERMISSIONS.parent).not.toContain('students:read');
    expect(ROLE_PERMISSIONS.parent).not.toContain('parents:read');
  });
});
