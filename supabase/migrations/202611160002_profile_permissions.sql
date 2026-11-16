-- Per-user permission overrides.
--
-- The four academy roles remain the default permission matrix. This table lets
-- an administrator grant or revoke a named permission for one account on top of
-- that role. The Angular app merges these rows into AuthService.hasPermission(),
-- so menus, routes and action buttons follow the override.
--
-- Scope note: the database RLS policies still enforce the base role. An override
-- changes what the app offers; it cannot widen a database row policy. Revoking a
-- permission therefore hides the screen/action but is not a hard API boundary
-- until the RLS policies themselves become permission-aware.

create table if not exists public.profile_permissions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  effect text not null check (effect in ('grant', 'revoke')),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (profile_id, permission_key)
);

create index if not exists profile_permissions_profile_idx
  on public.profile_permissions(profile_id);

alter table public.profile_permissions enable row level security;

-- A signed-in account can read its own overrides so the client can apply them.
-- Administrators can read all rows for the settings screen. Writes go through the
-- service-role operation below.
drop policy if exists profile_permissions_read on public.profile_permissions;
create policy profile_permissions_read on public.profile_permissions
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

revoke all on public.profile_permissions from anon, authenticated;
grant select on public.profile_permissions to authenticated;
grant all on public.profile_permissions to service_role;

-- Atomically replaces a profile's override set. The Edge Function validates the
-- caller and writes the audit row; this function only guarantees that a partial
-- write can never leave a half-applied permission set.
create or replace function public.replace_profile_permissions(
  target_profile uuid,
  entries jsonb,
  change_reason text,
  actor_profile uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  entry jsonb;
  v_permission text;
  v_effect text;
begin
  if target_profile is null then
    raise exception 'A target profile is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = target_profile) then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  if change_reason is null
     or char_length(btrim(change_reason)) < 3
     or char_length(btrim(change_reason)) > 500 then
    raise exception 'A reason of 3 to 500 characters is required' using errcode = '22023';
  end if;
  if entries is null or jsonb_typeof(entries) <> 'array' then
    raise exception 'entries must be a JSON array' using errcode = '22023';
  end if;
  if actor_profile is not null and not exists (select 1 from public.profiles where id = actor_profile) then
    raise exception 'Actor profile not found' using errcode = 'P0002';
  end if;

  for entry in select * from jsonb_array_elements(entries) loop
    v_permission := entry->>'permissionKey';
    v_effect := entry->>'effect';
    if v_effect is null or v_effect not in ('grant', 'revoke') then
      raise exception 'Each entry needs effect grant or revoke' using errcode = '22023';
    end if;
    if v_permission is null or not exists (select 1 from public.permissions where key = v_permission) then
      raise exception 'Unknown permission %', coalesce(v_permission, '') using errcode = '22023';
    end if;
  end loop;

  delete from public.profile_permissions where profile_id = target_profile;
  insert into public.profile_permissions(profile_id, permission_key, effect, reason, created_by)
    select target_profile, item->>'permissionKey', item->>'effect', btrim(change_reason), actor_profile
    from jsonb_array_elements(entries) as item;
end;
$$;

-- Only the service role (the admin-manage-users Edge Function) may replace
-- overrides. A browser session cannot call this function directly.
revoke all on function public.replace_profile_permissions(uuid, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.replace_profile_permissions(uuid, jsonb, text, uuid) to service_role;

comment on table public.profile_permissions is 'Per-account permission grants/revocations layered over the role matrix; the app applies them, service-role operations change them.';
comment on column public.profile_permissions.effect is 'grant adds a permission the role lacks; revoke removes one the role would otherwise have.';
comment on function public.replace_profile_permissions(uuid, jsonb, text, uuid) is 'Atomically replaces one profile permission override set after validating keys, effect and reason.';
