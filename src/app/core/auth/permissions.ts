import { StaffRole } from './auth.model';

export type Permission =
  | 'coach:portal'
  | 'children:read'
  | 'students:read'
  | 'students:write'
  | 'parents:read'
  | 'parents:write'
  | 'coaches:read'
  | 'coaches:write'
  | 'batches:read'
  | 'batches:write'
  | 'enrollments:write'
  | 'attendance:read'
  | 'attendance:write'
  | 'fees:write'
  | 'notifications:read'
  | 'reports:read'
  | 'settings:write';

export const ROLE_PERMISSIONS: Readonly<Record<StaffRole, readonly Permission[]>> = {
  admin: [
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
  ],
  coach: ['coach:portal'],
  receptionist: [
    'students:read',
    'students:write',
    'parents:read',
    'parents:write',
    'coaches:read',
    'batches:read',
    'batches:write',
    'enrollments:write',
    'attendance:read',
    'attendance:write',
    'fees:write',
    'notifications:read',
  ],
  parent: ['children:read'],
};
