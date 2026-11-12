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

export interface RoleDefinition {
  readonly key: StaffRole;
  readonly label: string;
  readonly description: string;
  readonly rank: number;
  readonly isStaff: boolean;
}

export interface PermissionDefinition {
  readonly key: Permission;
  readonly label: string;
  readonly description: string;
  readonly area: string;
}

export interface RoleCatalog {
  readonly roles: readonly RoleDefinition[];
  readonly permissions: readonly PermissionDefinition[];
  readonly matrix: Readonly<Record<StaffRole, readonly Permission[]>>;
}

/** Built-in labels are the offline fallback; the database catalogue is authoritative once loaded. */
export const ROLE_LABELS: Readonly<Record<StaffRole, string>> = {
  admin: 'Administrator',
  receptionist: 'Receptionist',
  coach: 'Coach',
  parent: 'Parent',
};

export const ROLE_DESCRIPTIONS: Readonly<Record<StaffRole, string>> = {
  admin: 'Full academy administration, settings and reporting.',
  receptionist: 'Day-to-day students, parents, batches, attendance and fees.',
  coach: 'Coach portal for assigned batches and attendance.',
  parent: 'Parent portal for their own children and receipts.',
};

export const PERMISSION_LABELS: Readonly<Record<Permission, string>> = {
  'coach:portal': 'Coach portal',
  'children:read': 'Own children',
  'students:read': 'View students',
  'students:write': 'Manage students',
  'parents:read': 'View parents',
  'parents:write': 'Manage parents',
  'coaches:read': 'View coaches',
  'coaches:write': 'Manage coaches',
  'batches:read': 'View batches',
  'batches:write': 'Manage batches',
  'enrollments:write': 'Manage enrollments',
  'attendance:read': 'View attendance',
  'attendance:write': 'Record attendance',
  'fees:write': 'Manage fees',
  'notifications:read': 'View notifications',
  'reports:read': 'View reports',
  'settings:write': 'Manage settings',
};

export const PERMISSION_DESCRIPTIONS: Readonly<Record<Permission, string>> = {
  'coach:portal': 'Open the coach workspace for assigned batches.',
  'children:read': 'Read only the records linked to the signed-in parent.',
  'students:read': 'Read student profiles and enrolment summaries.',
  'students:write': 'Create and update student records, photos and documents.',
  'parents:read': 'Read guardian profiles and linked students.',
  'parents:write': 'Create and update guardian profiles and links.',
  'coaches:read': 'Read coach profiles and batch assignments.',
  'coaches:write': 'Create and update coach profiles and assignments.',
  'batches:read': 'Read batches, schedules and rosters.',
  'batches:write': 'Create and update batches, schedules and coaches.',
  'enrollments:write': 'Enrol and withdraw students, and record corrections.',
  'attendance:read': 'Read attendance registers and history.',
  'attendance:write': 'Check students in and out and correct attendance.',
  'fees:write': 'Record payments, refunds and fee adjustments.',
  'notifications:read': 'Read academy notifications and delivery status.',
  'reports:read': 'Open academy reports and print documents.',
  'settings:write': 'Change academy settings, appearance and user access.',
};

export const PERMISSION_AREAS: Readonly<Record<Permission, string>> = {
  'coach:portal': 'Portal',
  'children:read': 'Portal',
  'students:read': 'Students',
  'students:write': 'Students',
  'parents:read': 'Parents',
  'parents:write': 'Parents',
  'coaches:read': 'Coaches',
  'coaches:write': 'Coaches',
  'batches:read': 'Batches',
  'batches:write': 'Batches',
  'enrollments:write': 'Enrollments',
  'attendance:read': 'Attendance',
  'attendance:write': 'Attendance',
  'fees:write': 'Fees',
  'notifications:read': 'Notifications',
  'reports:read': 'Reports',
  'settings:write': 'Settings',
};

export const ROLE_ORDER: readonly StaffRole[] = ['admin', 'receptionist', 'coach', 'parent'];

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

export const ALL_PERMISSIONS: readonly Permission[] = Object.keys(PERMISSION_LABELS) as Permission[];

export const FALLBACK_ROLE_CATALOG: RoleCatalog = {
  roles: ROLE_ORDER.map((key, index) => ({
    key,
    label: ROLE_LABELS[key],
    description: ROLE_DESCRIPTIONS[key],
    rank: (index + 1) * 10,
    isStaff: key !== 'parent',
  })),
  permissions: ALL_PERMISSIONS.map((key) => ({
    key,
    label: PERMISSION_LABELS[key],
    description: PERMISSION_DESCRIPTIONS[key],
    area: PERMISSION_AREAS[key],
  })),
  matrix: ROLE_PERMISSIONS,
};
