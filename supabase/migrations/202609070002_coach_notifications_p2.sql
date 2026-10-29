begin;

create or replace function public.coach_mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if public.current_user_role() <> 'coach' then
    raise exception 'coach_access_required' using errcode = '42501';
  end if;

  update public.notifications notification
  set read_at = now()
  where notification.read_at is null
    and exists (
      select 1 from public.coaches coach
      where coach.id = notification.coach_id
        and coach.profile_id = auth.uid()
        and coach.status = 'active'
    );

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.coach_mark_all_notifications_read() from public;
grant execute on function public.coach_mark_all_notifications_read() to authenticated;

commit;
