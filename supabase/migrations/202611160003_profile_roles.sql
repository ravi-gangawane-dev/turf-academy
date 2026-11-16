-- App-level multi-role assignments.
--
-- `profiles.role` remains the primary role. It is the role the database RLS
-- policies read through public.current_user_role(), so it still decides which
-- rows the account may read or write. This table adds the other roles an account
-- may hold: the Angular app unions their menus, routes and permissions so one
-- person can work in more than one portal (for example an administrator who also
-- coaches a batch).
--
-- Scope note: the database RLS policies are not multi-role aware. Additional
-- roles widen what the app offers, not what the database returns. The account's
-- primary role must always be one of its assigned roles.

create table if not exists public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null references public.roles(key) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (profile_id, role_key)
);

create index if not exists profile_roles_role_idx
  on public.profile_roles(role_key);

-- Every existing profile starts with its current primary role. A later trigger
-- keeps that invariant for profile inserts and primary-role changes.
insert into public.profile_roles(profile_id, role_key)
select profile.id, profile.role::text
from public.profiles as profile
join public.roles as role on role.key = profile.role::text
on conflict (profile_id, role_key) do nothing;

create or replace function public.keep_primary_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profile_roles(profile_id, role_key)
  values (new.id, new.role::text)
  on conflict (profile_id, role_key) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_keep_primary_role on public.profiles;
create trigger profiles_keep_primary_role
  after insert or update of role on public.profiles
  for each row execute function public.keep_primary_profile_role();

alter table public.profile_roles enable row level security;

-- An account can read its own role assignments so the client can apply them;
-- administrators can read every assignment for the Users screen. Writes go
-- through the service-role operation below.
drop policy if exists profile_roles_read on public.profile_roles;
create policy profile_roles_read on public.profile_roles
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

revoke all on public.profile_roles from anon, authenticated;
grant select on public.profile_roles to authenticated;
grant all on public.profile_roles to service_role;

-- Atomically replaces a profile's assigned role set. The Edge Function validates
-- the caller and writes the audit row; this function guarantees that a partial
-- write can never leave the account without its primary role.
create or replace function public.replace_profile_roles(
  target_profile uuid,
  role_keys text[],
  change_reason text,
  actor_profile uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_primary text;
  v_role text;
begin
  if target_profile is null then
    raise exception 'A target profile is required' using errcode = '22023';
  end if;
  select role::text into v_primary from public.profiles where id = target_profile;
  if v_primary is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  if change_reason is null
     or char_length(btrim(change_reason)) < 3
     or char_length(btrim(change_reason)) > 500 then
    raise exception 'A reason of 3 to 500 characters is required' using errcode = '22023';
  end if;
  if role_keys is null or array_length(role_keys, 1) is null then
    raise exception 'At least one role is required' using errcode = '22023';
  end if;
  if actor_profile is not null and not exists (select 1 from public.profiles where id = actor_profile) then
    raise exception 'Actor profile not found' using errcode = 'P0002';
  end if;

  if (select count(*) from unnest(role_keys) as key_value) <> (select count(distinct key_value) from unnest(role_keys) as key_value) then
    raise exception 'Each role may appear only once' using errcode = '22023';
  end if;
  foreach v_role in array role_keys loop
    if not exists (select 1 from public.roles where key = v_role) then
      raise exception 'Unknown role %', coalesce(v_role, '') using errcode = '22023';
    end if;
  end loop;
  if not (v_primary = any(role_keys)) then
    raise exception 'The primary role must be one of the assigned roles' using errcode = '22023';
  end if;

  delete from public.profile_roles where profile_id = target_profile;
  insert into public.profile_roles(profile_id, role_key, assigned_by)
    select target_profile, key_value, actor_profile
    from unnest(role_keys) as key_value;
end;
$$;

-- Only the service role (the admin-manage-users Edge Function) may replace role
-- assignments. A browser session cannot call this function directly.
revoke all on function public.replace_profile_roles(uuid, text[], text, uuid) from public, anon, authenticated;
grant execute on function public.replace_profile_roles(uuid, text[], text, uuid) to service_role;

comment on table public.profile_roles is 'App-level roles held by a profile; profiles.role stays the primary role used by database RLS.';
comment on column public.profile_roles.role_key is 'An additional academy role from the roles catalogue.';
comment on function public.replace_profile_roles(uuid, text[], text, uuid) is 'Atomically replaces one profile role set after validating keys, the primary role and the reason.';
comment on function public.keep_primary_profile_role() is 'Keeps profiles.role present in profile_roles after a profile insert or primary-role change.';
