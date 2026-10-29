begin;

do $$
declare
  target_student_id uuid;
  target_parent public.parents;
  matching_students integer;
  notification_subject text;
  notification_body text;
  notification_recipient text;
begin
  select count(*) into matching_students
  from public.students
  where full_name = 'Ravi G' and status = 'active';

  if matching_students = 1 then
    select id into strict target_student_id
    from public.students
    where full_name = 'Ravi G' and status = 'active';

    select parent.* into target_parent
    from public.student_parents student_parent
    join public.parents parent on parent.id = student_parent.parent_id
    join public.profiles profile on profile.id = parent.profile_id
    where student_parent.student_id = target_student_id
      and parent.status = 'active'
      and profile.status = 'active'
      and profile.is_active
    order by student_parent.is_primary desc, parent.id
    limit 1;
  end if;

  if target_parent.id is not null then
    notification_subject := 'Happy birthday, Ravi G!';
    notification_body := 'Please join us in wishing Ravi G a very happy birthday today!';
    notification_recipient := coalesce(
      nullif(target_parent.email, ''),
      nullif(target_parent.phone, ''),
      target_parent.id::text
    );
  else
    notification_subject := 'Preview: Happy birthday, Ravi G!';
    notification_body := 'Preview only - no active linked parent account was found, so this sample was not delivered.';
    notification_recipient := 'Preview only - no recipient';
  end if;

  insert into public.notifications(
    student_id,
    parent_id,
    channel,
    template_key,
    recipient,
    subject,
    body,
    status,
    sent_at,
    client_reference
  )
  values (
    target_student_id,
    target_parent.id,
    'in_app',
    'student_birthday',
    notification_recipient,
    notification_subject,
    notification_body,
    'sent',
    now(),
    'manual:birthday:ravi-g:2026-10-13'
  )
  on conflict (client_reference) do nothing;
end;
$$;

commit;
