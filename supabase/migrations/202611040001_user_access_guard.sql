begin;

-- P0: direct profile writes must obey the same self-demotion and last-admin
-- rules as the admin-manage-users Edge Function. The trigger runs for every
-- UPDATE of role/status/is_active, including writes made with the service role
-- (the Edge Function still performs its own friendly checks first).
create or replace function public.guard_profile_access_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  was_active_admin boolean := old.role = 'admin' and old.status = 'active' and old.is_active;
  will_be_active_admin boolean := new.role = 'admin' and new.status = 'active' and new.is_active;
  remaining_admins integer;
begin
  if not was_active_admin or will_be_active_admin then
    return new;
  end if;

  -- An administrator cannot remove their own active administrator access,
  -- even through a direct table write that bypasses the Edge Function.
  if actor is not null and actor = old.id then
    raise exception 'You cannot remove your own active administrator access.'
      using errcode = '42501', hint = 'self_admin_removal';
  end if;

  select count(*) into remaining_admins
  from public.profiles
  where role = 'admin' and status = 'active' and is_active and id <> old.id;

  if remaining_admins = 0 then
    raise exception 'At least one active administrator must remain.'
      using errcode = '23514', hint = 'last_admin';
  end if;

  return new;
end $$;

drop trigger if exists guard_profile_access_change on public.profiles;
create trigger guard_profile_access_change
  before update of role, status, is_active on public.profiles
  for each row execute function public.guard_profile_access_change();

-- P0: direct authenticated changes are audited with the actor and before/after
-- values. The Edge Function (service role, auth.uid() is null) writes its own
-- audit row with the requesting administrator as the actor, so this trigger
-- deliberately skips service-role writes to avoid duplicate events.
create or replace function public.audit_profile_access_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    return new;
  end if;
  if old.role is not distinct from new.role
     and old.status is not distinct from new.status
     and old.is_active is not distinct from new.is_active then
    return new;
  end if;

  insert into public.audit_logs(actor_id, action, table_name, record_id, old_values, new_values)
  values (
    actor,
    'user_access_updated',
    'profiles',
    new.id::text,
    jsonb_build_object('role', old.role, 'status', old.status, 'is_active', old.is_active),
    jsonb_build_object('role', new.role, 'status', new.status, 'is_active', new.is_active)
  );
  return new;
end $$;

drop trigger if exists audit_profile_access_change on public.profiles;
create trigger audit_profile_access_change
  after update of role, status, is_active on public.profiles
  for each row execute function public.audit_profile_access_change();

commit;
