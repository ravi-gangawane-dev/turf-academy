-- Authoritative role and permission catalogue.
--
-- Before this migration the role list and permission matrix existed only in the
-- Angular bundle and in the admin-manage-users Edge Function. The UI now reads
-- these tables through PostgREST, and the Edge Function validates invitations
-- against the same rows, so adding or relabelling a role does not require a
-- client rebuild. The TypeScript matrix remains only as an offline fallback.

create table if not exists public.roles (
  key text primary key,
  label text not null check (length(trim(label)) > 0),
  description text not null default '',
  rank smallint not null default 0,
  is_staff boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permissions (
  key text primary key,
  label text not null check (length(trim(label)) > 0),
  description text not null default '',
  area text not null default 'General',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_key text not null references public.roles(key) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

create index if not exists role_permissions_permission_idx
  on public.role_permissions(permission_key);

insert into public.roles (key, label, description, rank, is_staff) values
  ('admin', 'Administrator', 'Full academy administration, settings and reporting.', 10, true),
  ('receptionist', 'Receptionist', 'Day-to-day students, parents, batches, attendance and fees.', 20, true),
  ('coach', 'Coach', 'Coach portal for assigned batches and attendance.', 30, true),
  ('parent', 'Parent', 'Parent portal for their own children and receipts.', 40, false)
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  rank = excluded.rank,
  is_staff = excluded.is_staff,
  updated_at = now();

insert into public.permissions (key, label, description, area) values
  ('coach:portal', 'Coach portal', 'Open the coach workspace for assigned batches.', 'Portal'),
  ('children:read', 'Own children', 'Read only the records linked to the signed-in parent.', 'Portal'),
  ('students:read', 'View students', 'Read student profiles and enrolment summaries.', 'Students'),
  ('students:write', 'Manage students', 'Create and update student records, photos and documents.', 'Students'),
  ('parents:read', 'View parents', 'Read guardian profiles and linked students.', 'Parents'),
  ('parents:write', 'Manage parents', 'Create and update guardian profiles and links.', 'Parents'),
  ('coaches:read', 'View coaches', 'Read coach profiles and batch assignments.', 'Coaches'),
  ('coaches:write', 'Manage coaches', 'Create and update coach profiles and assignments.', 'Coaches'),
  ('batches:read', 'View batches', 'Read batches, schedules and rosters.', 'Batches'),
  ('batches:write', 'Manage batches', 'Create and update batches, schedules and coaches.', 'Batches'),
  ('enrollments:write', 'Manage enrollments', 'Enrol and withdraw students, and record corrections.', 'Enrollments'),
  ('attendance:read', 'View attendance', 'Read attendance registers and history.', 'Attendance'),
  ('attendance:write', 'Record attendance', 'Check students in and out and correct attendance.', 'Attendance'),
  ('fees:write', 'Manage fees', 'Record payments, refunds and fee adjustments.', 'Fees'),
  ('notifications:read', 'View notifications', 'Read academy notifications and delivery status.', 'Notifications'),
  ('reports:read', 'View reports', 'Open academy reports and print documents.', 'Reports'),
  ('settings:write', 'Manage settings', 'Change academy settings, appearance and user access.', 'Settings')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  area = excluded.area,
  updated_at = now();

insert into public.role_permissions (role_key, permission_key) values
  ('admin', 'students:read'),
  ('admin', 'students:write'),
  ('admin', 'parents:read'),
  ('admin', 'parents:write'),
  ('admin', 'coaches:read'),
  ('admin', 'coaches:write'),
  ('admin', 'batches:read'),
  ('admin', 'batches:write'),
  ('admin', 'enrollments:write'),
  ('admin', 'attendance:read'),
  ('admin', 'attendance:write'),
  ('admin', 'fees:write'),
  ('admin', 'notifications:read'),
  ('admin', 'reports:read'),
  ('admin', 'settings:write'),
  ('receptionist', 'students:read'),
  ('receptionist', 'students:write'),
  ('receptionist', 'parents:read'),
  ('receptionist', 'parents:write'),
  ('receptionist', 'coaches:read'),
  ('receptionist', 'batches:read'),
  ('receptionist', 'batches:write'),
  ('receptionist', 'enrollments:write'),
  ('receptionist', 'attendance:read'),
  ('receptionist', 'attendance:write'),
  ('receptionist', 'fees:write'),
  ('receptionist', 'notifications:read'),
  ('coach', 'coach:portal'),
  ('parent', 'children:read')
on conflict (role_key, permission_key) do nothing;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

-- The catalogue is readable by every signed-in account so guards and the
-- settings screens can render the same source of truth. It is changed through
-- reviewed service-role operations, never by a browser session.
drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles
  for select to authenticated
  using (true);

drop policy if exists permissions_read on public.permissions;
create policy permissions_read on public.permissions
  for select to authenticated
  using (true);

drop policy if exists role_permissions_read on public.role_permissions;
create policy role_permissions_read on public.role_permissions
  for select to authenticated
  using (true);

revoke all on public.roles, public.permissions, public.role_permissions from anon, authenticated;
grant select on public.roles, public.permissions, public.role_permissions to authenticated;
grant all on public.roles, public.permissions, public.role_permissions to service_role;

comment on table public.roles is 'Authoritative academy role catalogue read by the Angular app and admin-manage-users.';
comment on table public.permissions is 'Named permissions that can be granted to a role.';
comment on table public.role_permissions is 'Role-to-permission grants; the browser reads this matrix, service-role operations change it.';
