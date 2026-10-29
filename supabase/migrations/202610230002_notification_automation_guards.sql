-- Respect parent opt-outs at generation time and notify update-based check-ins.

begin;

create or replace function public.queue_automated_parent_whatsapp_notice(
  p_parent_id uuid,
  p_student_id uuid,
  p_template_key text,
  p_reference text,
  p_values jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_row public.parents;
  template_row public.notification_templates;
  rendered_subject text;
  rendered_body text;
  placeholder record;
  recipient text;
begin
  select * into parent_row
  from public.parents
  where id = p_parent_id and status = 'active'
    and coalesce(communication_preferences ->> 'whatsapp', 'true') <> 'false';
  if not found or not exists (select 1 from public.academy_settings where id and 'whatsapp' = any(notification_channels)) then
    return;
  end if;

  recipient := coalesce(nullif(parent_row.whatsapp, ''), nullif(parent_row.phone, ''));
  if recipient is null then return; end if;

  select * into template_row
  from public.notification_templates
  where template_key = p_template_key and channel = 'whatsapp' and status = 'active';
  if not found then return; end if;

  rendered_subject := coalesce(template_row.subject, template_row.name);
  rendered_body := template_row.body;
  for placeholder in select key, value from jsonb_each_text(coalesce(p_values, '{}'::jsonb))
  loop
    rendered_subject := replace(rendered_subject, '{' || placeholder.key || '}', coalesce(placeholder.value, ''));
    rendered_body := replace(rendered_body, '{' || placeholder.key || '}', coalesce(placeholder.value, ''));
  end loop;

  insert into public.notifications(
    student_id, parent_id, channel, template_key, recipient, subject, body, status, client_reference
  )
  values (p_student_id, p_parent_id, 'whatsapp', p_template_key, recipient,
    rendered_subject, rendered_body, 'queued', p_reference)
  on conflict (client_reference) do nothing;
end;
$$;

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
      and coalesce(p.communication_preferences ->> 'email', 'true') <> 'false'
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

create or replace function public.notify_parents_of_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_name text;
  batch_name text;
  event_key text;
  event_time timestamptz;
  parent_row record;
begin
  if tg_op = 'INSERT' then
    if new.status = 'absent' then
      event_key := 'attendance_absent';
      event_time := now();
    elsif new.check_in_at is not null then
      event_key := 'attendance_check_in';
      event_time := new.check_in_at;
    else
      return new;
    end if;
  elsif new.status = 'absent' and old.status is distinct from 'absent' then
    event_key := 'attendance_absent';
    event_time := now();
  elsif old.check_out_at is null and new.check_out_at is not null then
    event_key := 'attendance_check_out';
    event_time := new.check_out_at;
  elsif old.check_in_at is null and new.check_in_at is not null then
    event_key := 'attendance_check_in';
    event_time := new.check_in_at;
  else
    return new;
  end if;

  select s.full_name, b.name
  into student_name, batch_name
  from public.students s
  join public.batches b on b.id = new.batch_id
  where s.id = new.student_id;

  for parent_row in
    select p.id
    from public.student_parents sp
    join public.parents p on p.id = sp.parent_id
    where sp.student_id = new.student_id and p.status = 'active'
  loop
    if event_key = 'attendance_absent' then
      perform public.queue_automated_parent_notice(
        parent_row.id,
        new.student_id,
        event_key,
        'attendance:' || new.id::text || ':' || parent_row.id::text || ':' || event_key,
        jsonb_build_object(
          'student_name', student_name,
          'batch_name', batch_name,
          'session_date', new.attendance_date::text,
          'parent_name', (select p.full_name from public.parents p where p.id = parent_row.id)
        )
      );
    else
      perform public.queue_automated_parent_notice(
        parent_row.id,
        new.student_id,
        event_key,
        'attendance:' || new.id::text || ':' || parent_row.id::text || ':' || event_key,
        jsonb_build_object(
          'student_name', student_name,
          'batch_name', batch_name,
          'event_time', to_char(event_time at time zone coalesce((select timezone from public.academy_settings where id), 'Asia/Kolkata'), 'HH12:MI AM'),
          'session_date', new.attendance_date::text,
          'parent_name', (select p.full_name from public.parents p where p.id = parent_row.id)
        )
      );
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists attendance_parent_notification on public.attendance_records;

create trigger attendance_parent_notification

  after insert or update of check_in_at, check_out_at, status on public.attendance_records

  for each row execute function public.notify_parents_of_attendance();

commit;
