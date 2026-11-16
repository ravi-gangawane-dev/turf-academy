begin;

-- P2-11: deleting a profile must obey the same self/last-administrator rules as
-- an access change. The trigger also runs for deletes cascaded from auth.users
-- by an operator or the admin-manage-users Edge Function, where auth.uid() is
-- null, so the last-administrator check still applies to service-role writes.
create or replace function public.guard_profile_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  remaining_admins integer;
begin
  if not (old.role = 'admin' and old.status = 'active' and old.is_active) then
    return old;
  end if;

  -- An administrator cannot delete their own active administrator profile,
  -- even through a direct table write that bypasses the Edge Function.
  if actor is not null and actor = old.id then
    raise exception 'You cannot delete your own administrator account.'
      using errcode = 'check_violation', hint = 'self_admin_removal';
  end if;

  select count(*) into remaining_admins
  from public.profiles
  where role = 'admin' and status = 'active' and is_active and id <> old.id;

  if remaining_admins = 0 then
    raise exception 'At least one active administrator must remain.'
      using errcode = 'check_violation', hint = 'last_admin';
  end if;

  return old;
end $$;
revoke all on function public.guard_profile_deletion() from public;

drop trigger if exists guard_profile_deletion on public.profiles;
create trigger guard_profile_deletion
  before delete on public.profiles
  for each row execute function public.guard_profile_deletion();

commit;
