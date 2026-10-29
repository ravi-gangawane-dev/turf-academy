begin;

-- Resolve ownership without entering recursive coach/parent RLS policies.
-- Callers can only ask whether the current active identity owns these recipients.
create function public.owns_notification_recipient(p_parent_id uuid, p_coach_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (public.current_user_role() = 'parent' and exists(
      select 1 from public.parents p where p.id = p_parent_id
        and p.profile_id = auth.uid() and p.status = 'active'))
    or (public.current_user_role() = 'coach' and exists(
      select 1 from public.coaches c where c.id = p_coach_id
        and c.profile_id = auth.uid() and c.status = 'active')), false);
$$;
revoke all on function public.owns_notification_recipient(uuid, uuid) from public, anon;
grant execute on function public.owns_notification_recipient(uuid, uuid) to authenticated;

drop policy if exists notifications_read on public.notifications;
drop policy if exists notifications_scoped_read on public.notifications;
create policy notifications_scoped_read on public.notifications for select to authenticated
  using (public.is_admin_or_receptionist() or public.owns_notification_recipient(parent_id, coach_id));

create or replace function public.parent_mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'parent' then
    raise exception 'parent_access_required' using errcode = '42501';
  end if;
  update public.notifications n set read_at = coalesce(n.read_at, now())
    where n.id = p_notification_id and public.owns_notification_recipient(n.parent_id, null);
  if not found then raise exception 'notification_not_found' using errcode = '42501'; end if;
end;
$$;
create or replace function public.parent_mark_all_notifications_read()
returns integer language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  if public.current_user_role() is distinct from 'parent' then
    raise exception 'parent_access_required' using errcode = '42501';
  end if;
  update public.notifications n set read_at = now()
    where n.read_at is null and public.owns_notification_recipient(n.parent_id, null);
  get diagnostics affected = row_count;
  return affected;
end;
$$;
create or replace function public.coach_mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'coach' then
    raise exception 'coach_access_required' using errcode = '42501';
  end if;
  update public.notifications n set read_at = coalesce(n.read_at, now())
    where n.id = p_notification_id and public.owns_notification_recipient(null, n.coach_id);
  if not found then raise exception 'notification_not_found' using errcode = '42501'; end if;
end;
$$;
create or replace function public.coach_mark_all_notifications_read()
returns integer language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  if public.current_user_role() is distinct from 'coach' then
    raise exception 'coach_access_required' using errcode = '42501';
  end if;
  update public.notifications n set read_at = now()
    where n.read_at is null and public.owns_notification_recipient(null, n.coach_id);
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.parent_mark_notification_read(uuid), public.parent_mark_all_notifications_read(),
  public.coach_mark_notification_read(uuid), public.coach_mark_all_notifications_read() from public, anon;
grant execute on function public.parent_mark_notification_read(uuid), public.parent_mark_all_notifications_read(),
  public.coach_mark_notification_read(uuid), public.coach_mark_all_notifications_read() to authenticated;
commit;
