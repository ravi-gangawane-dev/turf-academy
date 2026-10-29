begin;

insert into public.notification_templates(name, template_key, channel, subject, body, status)
values
  (
    'Student birthday email',
    'student_birthday_email',
    'email',
    'Birthday wishes for {student_name}',
    'Hi {parent_name}, please join us in wishing {student_name} a very happy birthday today!',
    'active'
  ),
  (
    'Coach birthday email',
    'coach_birthday_email',
    'email',
    'Happy birthday, {coach_name}!',
    'Hello {coach_name}, everyone at Turf Academy wishes you a wonderful birthday. Thank you for inspiring our players!',
    'active'
  )
on conflict (template_key) do nothing;

create or replace function public.queue_birthday_email_for_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  template_row public.notification_templates;
  target_email text;
  parent_name text;
  student_name text;
  coach_name text;
  values_to_render jsonb;
  rendered_subject text;
  rendered_body text;
  placeholder record;
  email_template_key text;
begin
  if new.channel <> 'in_app' then
    return new;
  end if;

  if new.template_key = 'student_birthday' and new.student_id is not null and new.parent_id is not null then
    if not exists (
      select 1
      from public.academy_settings
      where id and 'email' = any(notification_channels)
    ) then
      return new;
    end if;

    select p.email, p.full_name, s.full_name
    into target_email, parent_name, student_name
    from public.parents p
    join public.student_parents sp on sp.parent_id = p.id
    join public.students s on s.id = sp.student_id
    where p.id = new.parent_id
      and s.id = new.student_id
      and p.status = 'active'
      and nullif(p.email, '') is not null;

    email_template_key := 'student_birthday_email';
    values_to_render := jsonb_build_object(
      'parent_name', parent_name,
      'student_name', student_name
    );
  elsif new.template_key = 'coach_birthday' and new.coach_id is not null then
    if not exists (
      select 1
      from public.academy_settings
      where id and 'email' = any(notification_channels)
    ) then
      return new;
    end if;

    select c.email, c.full_name
    into target_email, coach_name
    from public.coaches c
    where c.id = new.coach_id
      and c.status = 'active'
      and nullif(c.email, '') is not null;

    email_template_key := 'coach_birthday_email';
    values_to_render := jsonb_build_object('coach_name', coach_name);
  else
    return new;
  end if;

  if nullif(target_email, '') is null then
    return new;
  end if;

  select * into template_row
  from public.notification_templates
  where template_key = email_template_key
    and channel = 'email'
    and status = 'active';
  if not found then
    return new;
  end if;

  rendered_subject := coalesce(template_row.subject, template_row.name);
  rendered_body := template_row.body;
  for placeholder in
    select key, value from jsonb_each_text(coalesce(values_to_render, '{}'::jsonb))
  loop
    rendered_subject := replace(
      rendered_subject,
      '{' || placeholder.key || '}',
      coalesce(placeholder.value, '')
    );
    rendered_body := replace(
      rendered_body,
      '{' || placeholder.key || '}',
      coalesce(placeholder.value, '')
    );
  end loop;

  insert into public.notifications(
    student_id,
    parent_id,
    coach_id,
    channel,
    template_key,
    recipient,
    subject,
    body,
    status,
    client_reference
  )
  values (
    new.student_id,
    new.parent_id,
    new.coach_id,
    'email',
    email_template_key,
    target_email,
    rendered_subject,
    rendered_body,
    'queued',
    coalesce(new.client_reference, 'birthday-notification:' || new.id::text) || ':email'
  )
  on conflict (client_reference) do nothing;

  return new;
end;
$$;

revoke all on function public.queue_birthday_email_for_notification()
  from public, anon, authenticated;

drop trigger if exists queue_birthday_email_notification on public.notifications;
create trigger queue_birthday_email_notification
  after insert on public.notifications
  for each row execute function public.queue_birthday_email_for_notification();

commit;
