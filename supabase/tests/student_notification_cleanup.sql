-- Run with `supabase db query --linked --file ...` or against a local database.
-- Requires an active admin test profile. All fixtures roll back.
begin;
select set_config('request.jwt.claim.sub', (
  select id::text from public.profiles where role = 'admin' and is_active limit 1
), true);
set local role authenticated;

do $$
declare
  v_student_id uuid;
  v_guardian_id uuid;
  v_notification_id uuid;
begin
  if not public.is_admin() then raise exception 'Active admin fixture required'; end if;
  v_student_id := public.create_student_profile(jsonb_build_object(
    'full_name', 'Notification cleanup fixture', 'date_of_birth', '2014-01-01',
    'parent_name', 'Notification cleanup guardian', 'parent_phone', '9000000000',
    'joined_on', current_date
  ));
  select sp.parent_id into v_guardian_id from public.student_parents sp where sp.student_id = v_student_id;
  insert into public.notifications(student_id, parent_id, channel, recipient, body)
  values(v_student_id, v_guardian_id, 'in_app', 'cleanup-test', 'Preserved notification history')
  returning id into v_notification_id;

  perform public.delete_student_profile(v_student_id);
  if exists(select 1 from public.students where id = v_student_id) then
    raise exception 'Student was not deleted';
  end if;
  if exists(select 1 from public.parents where id = v_guardian_id) then
    raise exception 'Orphaned guardian was not deleted';
  end if;
  if not exists(select 1 from public.notifications n where n.id = v_notification_id
    and n.student_id is null and n.parent_id is null and n.body = 'Preserved notification history') then
    raise exception 'Notification history was not preserved';
  end if;
end;
$$;

rollback;
