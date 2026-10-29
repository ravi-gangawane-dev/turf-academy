-- Reviewed release candidate; apply only to confirmed project ttuigbkaluozglzgepsh.
-- No one-off student messages, test fixtures or external delivery calls.
begin;
-- Source: 202610130002_academy_notification_automations.sql

create table public.academy_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('holiday', 'special_event')),
  title text not null check (length(btrim(title)) between 2 and 120),
  event_date date not null,
  description text not null default '',
  status public.record_status not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index academy_events_active_date_idx
  on public.academy_events(event_date)
  where status = 'active';

alter table public.academy_events enable row level security;
create policy academy_events_staff_read on public.academy_events
  for select to authenticated using (public.is_admin_or_receptionist());
create policy academy_events_staff_write on public.academy_events
  for all to authenticated
  using (public.is_admin_or_receptionist())
  with check (public.is_admin_or_receptionist());
grant select, insert, update, delete on public.academy_events to authenticated;
create trigger set_updated_at before update on public.academy_events
  for each row execute function public.set_updated_at();

insert into public.notification_templates(name, template_key, channel, subject, body, status)
values
  ('Fee due today', 'fee_due_today', 'in_app', 'Fee due today',
    'Hi {parent_name}, {student_name}''s fee of {amount} for {batch_name} is due today ({due_date}). Please contact the academy if you have already paid.',
    'active'),
  ('Student birthday', 'student_birthday', 'in_app', 'Birthday wishes for {student_name}',
    'Please join us in wishing {student_name} a very happy birthday today!',
    'active'),
  ('Student birthday WhatsApp', 'student_birthday_whatsapp', 'whatsapp', 'Birthday wishes for {student_name}',
    'Hi {parent_name}, please join us in wishing {student_name} a very happy birthday today!',
    'active'),
  ('Coach birthday', 'coach_birthday', 'in_app', 'Happy birthday, {coach_name}!',
    'Wishing you a wonderful birthday, {coach_name}. Thank you for being part of Turf Academy!',
    'active'),
  ('Coach birthday WhatsApp', 'coach_birthday_whatsapp', 'whatsapp', 'Happy birthday, {coach_name}!',
    'Happy birthday, {coach_name}! Everyone at Turf Academy wishes you a wonderful day.',
    'active'),
  ('Student check-in', 'attendance_check_in', 'in_app', 'Student checked in',
    '{student_name} checked in at {event_time}.',
    'active'),
  ('Student check-out', 'attendance_check_out', 'in_app', 'Student checked out',
    '{student_name} checked out at {event_time}.',
    'active'),
  ('Academy holiday', 'academy_holiday', 'in_app', 'Academy holiday: {event_name}',
    '{event_name} is scheduled for {event_date}. {event_details}',
    'active'),
  ('Special academy event', 'academy_special_event', 'in_app', 'Academy event: {event_name}',
    'You are invited to {event_name} on {event_date}. {event_details}',
    'active'),
  ('Student marked absent', 'attendance_absent', 'in_app', 'Attendance alert for {student_name}',
    '{student_name} was marked absent from the {batch_name} session on {session_date}.',
    'active'),
  ('Three missed session days', 'attendance_missed_three_days', 'in_app', 'Attendance follow-up for {student_name}',
    'We have not recorded attendance for {student_name} during scheduled sessions from {from_date} to {to_date}. Please contact the academy if you need support.',
    'active')
on conflict (template_key) do nothing;

create or replace function public.queue_automated_parent_notice(
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
  where id = p_parent_id and status = 'active';
  if not found then return; end if;

  select * into template_row
  from public.notification_templates
  where template_key = p_template_key
    and channel = 'in_app'
    and status = 'active';
  if not found then return; end if;

  recipient := coalesce(nullif(parent_row.email, ''), nullif(parent_row.phone, ''), parent_row.id::text);
  rendered_subject := coalesce(template_row.subject, template_row.name);
  rendered_body := template_row.body;
  for placeholder in select key, value from jsonb_each_text(coalesce(p_values, '{}'::jsonb))
  loop
    rendered_subject := replace(rendered_subject, '{' || placeholder.key || '}', coalesce(placeholder.value, ''));
    rendered_body := replace(rendered_body, '{' || placeholder.key || '}', coalesce(placeholder.value, ''));
  end loop;

  insert into public.notifications(
    student_id, parent_id, channel, template_key, recipient, subject, body, status, sent_at, client_reference
  )
  values (
    p_student_id, p_parent_id, 'in_app', p_template_key, recipient,
    rendered_subject, rendered_body, 'sent', now(), p_reference
  )
  on conflict (client_reference) do nothing;
end;
$$;

revoke all on function public.queue_automated_parent_notice(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;

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
  where id = p_parent_id and status = 'active';
  if not found or not (select 'whatsapp' = any(notification_channels) from public.academy_settings where id) then
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

revoke all on function public.queue_automated_parent_whatsapp_notice(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.queue_automated_coach_notice(
  p_coach_id uuid,
  p_template_key text,
  p_reference text,
  p_values jsonb,
  p_channel text default 'in_app'
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  coach_row public.coaches;
  template_row public.notification_templates;
  rendered_subject text;
  rendered_body text;
  placeholder record;
  recipient text;
  delivery_status public.delivery_status;
begin
  select * into coach_row
  from public.coaches
  where id = p_coach_id and status = 'active' and profile_id is not null;
  if not found then return; end if;

  if p_channel = 'whatsapp' then
    if not (select 'whatsapp' = any(notification_channels) from public.academy_settings where id) then
      return;
    end if;
    recipient := nullif(coach_row.phone, '');
  elsif p_channel = 'in_app' then
    recipient := coalesce(nullif(coach_row.email, ''), nullif(coach_row.phone, ''), coach_row.id::text);
  else
    return;
  end if;
  if recipient is null then return; end if;

  select * into template_row
  from public.notification_templates
  where template_key = p_template_key and channel = p_channel and status = 'active';
  if not found then return; end if;

  rendered_subject := coalesce(template_row.subject, template_row.name);
  rendered_body := template_row.body;
  for placeholder in select key, value from jsonb_each_text(coalesce(p_values, '{}'::jsonb))
  loop
    rendered_subject := replace(rendered_subject, '{' || placeholder.key || '}', coalesce(placeholder.value, ''));
    rendered_body := replace(rendered_body, '{' || placeholder.key || '}', coalesce(placeholder.value, ''));
  end loop;

  delivery_status := case when p_channel = 'in_app' then 'sent'::public.delivery_status else 'queued'::public.delivery_status end;
  insert into public.notifications(
    coach_id, channel, template_key, recipient, subject, body, status, sent_at, client_reference
  )
  values (
    p_coach_id, p_channel, p_template_key, recipient, rendered_subject, rendered_body,
    delivery_status, case when p_channel = 'in_app' then now() else null end, p_reference
  )
  on conflict (client_reference) do nothing;
end;
$$;

revoke all on function public.queue_automated_coach_notice(uuid, text, text, jsonb, text)
  from public, anon, authenticated;

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
          'event_time', to_char(event_time at time zone 'Asia/Kolkata', 'HH12:MI AM'),
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
  after insert or update of check_out_at, status on public.attendance_records
  for each row execute function public.notify_parents_of_attendance();

create or replace function public.process_academy_notification_automations(p_today date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  row record;
  parent_row record;
  academy_currency text;
  academy_channels text[];
  last_attended_at timestamptz;
  latest_session_date date;
begin
  select currency_code, notification_channels into academy_currency, academy_channels
  from public.academy_settings where id;
  academy_currency := coalesce(academy_currency, 'INR');

  for row in
    select c.id, c.student_id, s.full_name, b.name as batch_name,
      c.due_date, balances.balance_amount
    from public.monthly_charges c
    join public.monthly_charge_balances balances on balances.id = c.id
    join public.students s on s.id = c.student_id and s.status = 'active'
    join public.enrollments e on e.id = c.enrollment_id and e.status = 'active'
    join public.batches b on b.id = e.batch_id
    where c.due_date = p_today and c.status <> 'waived' and balances.balance_amount > 0
  loop
    for parent_row in
      select p.id, p.full_name
      from public.student_parents sp
      join public.parents p on p.id = sp.parent_id
      where sp.student_id = row.student_id and p.status = 'active'
    loop
      perform public.queue_automated_parent_notice(
        parent_row.id,
        row.student_id,
        'fee_due_today',
        'automation:fee_due_today:' || row.id::text || ':' || p_today::text || ':' || parent_row.id::text,
        jsonb_build_object(
          'parent_name', parent_row.full_name,
          'student_name', row.full_name,
          'batch_name', row.batch_name,
          'amount', academy_currency || ' ' || to_char(row.balance_amount, 'FM999,999,990.00'),
          'due_date', row.due_date::text
        )
      );
    end loop;
  end loop;

  for row in
    select s.id, s.full_name
    from public.students s
    where s.status = 'active'
      and extract(month from s.date_of_birth) = extract(month from p_today)
      and extract(day from s.date_of_birth) = extract(day from p_today)
  loop
    for parent_row in
      select p.id, p.full_name
      from public.student_parents sp
      join public.parents p on p.id = sp.parent_id
      where sp.student_id = row.id and p.status = 'active'
    loop
      perform public.queue_automated_parent_notice(
        parent_row.id,
        row.id,
        'student_birthday',
        'automation:student_birthday:' || row.id::text || ':' || p_today::text || ':' || parent_row.id::text,
        jsonb_build_object('parent_name', parent_row.full_name, 'student_name', row.full_name)
      );
      if 'whatsapp' = any(coalesce(academy_channels, array[]::text[])) then
        perform public.queue_automated_parent_whatsapp_notice(
          parent_row.id,
          row.id,
          'student_birthday_whatsapp',
          'automation:student_birthday:whatsapp:' || row.id::text || ':' || p_today::text || ':' || parent_row.id::text,
          jsonb_build_object('parent_name', parent_row.full_name, 'student_name', row.full_name)
        );
      end if;
    end loop;
  end loop;

  for row in
    select c.id, c.full_name
    from public.coaches c
    where c.status = 'active'
      and c.profile_id is not null
      and c.date_of_birth is not null
      and extract(month from c.date_of_birth) = extract(month from p_today)
      and extract(day from c.date_of_birth) = extract(day from p_today)
  loop
    perform public.queue_automated_coach_notice(
      row.id,
      'coach_birthday',
      'automation:coach_birthday:' || row.id::text || ':' || p_today::text,
      jsonb_build_object('coach_name', row.full_name)
    );
    if 'whatsapp' = any(coalesce(academy_channels, array[]::text[])) then
      perform public.queue_automated_coach_notice(
        row.id,
        'coach_birthday_whatsapp',
        'automation:coach_birthday:whatsapp:' || row.id::text || ':' || p_today::text,
        jsonb_build_object('coach_name', row.full_name),
        'whatsapp'
      );
    end if;
  end loop;

  for row in
    select e.id, e.event_type, e.title, e.event_date, e.description
    from public.academy_events e
    where e.status = 'active' and e.event_date = p_today
  loop
    for parent_row in
      select distinct p.id, p.full_name
      from public.parents p
      join public.student_parents sp on sp.parent_id = p.id
      join public.enrollments enrollment on enrollment.student_id = sp.student_id
      join public.students s on s.id = enrollment.student_id and s.status = 'active'
      where p.status = 'active' and enrollment.status = 'active'
    loop
      perform public.queue_automated_parent_notice(
        parent_row.id,
        null,
        case row.event_type when 'holiday' then 'academy_holiday' else 'academy_special_event' end,
        'automation:' || row.event_type || ':' || row.id::text || ':' || row.event_date::text || ':' || parent_row.id::text,
        jsonb_build_object(
          'parent_name', parent_row.full_name,
          'event_name', row.title,
          'event_date', row.event_date::text,
          'event_details', nullif(row.description, '')
        )
      );
    end loop;
  end loop;

  for row in
    select distinct enrollment.student_id, enrollment.batch_id, s.full_name, b.name as batch_name
    from public.enrollments enrollment
    join public.students s on s.id = enrollment.student_id and s.status = 'active'
    join public.batches b on b.id = enrollment.batch_id
    where enrollment.status = 'active'
      and (
        select count(distinct session.session_date)
        from public.training_sessions session
        where session.batch_id = enrollment.batch_id
          and session.session_date between p_today - 3 and p_today - 1
          and session.status in ('upcoming', 'completed')
          and not exists (
            select 1 from public.attendance_records attendance
            where attendance.student_id = enrollment.student_id
              and attendance.batch_id = enrollment.batch_id
              and attendance.attendance_date = session.session_date
              and attendance.status in ('present', 'late', 'checked_out')
          )
      ) = 3
  loop
    select max(coalesce(attendance.check_in_at, attendance.created_at)) into last_attended_at
    from public.attendance_records attendance
    where attendance.student_id = row.student_id
      and attendance.batch_id = row.batch_id
      and attendance.status in ('present', 'late', 'checked_out');

    select max(session.session_date) into latest_session_date
    from public.training_sessions session
    where session.batch_id = row.batch_id
      and session.session_date between p_today - 3 and p_today - 1
      and session.status in ('upcoming', 'completed');

    for parent_row in
      select p.id, p.full_name
      from public.student_parents sp
      join public.parents p on p.id = sp.parent_id
      where sp.student_id = row.student_id and p.status = 'active'
    loop
      if not exists (
        select 1 from public.notifications n
        where n.student_id = row.student_id
          and n.parent_id = parent_row.id
          and n.template_key = 'attendance_missed_three_days'
          and n.created_at >= coalesce(last_attended_at, '-infinity'::timestamptz)
      ) then
        perform public.queue_automated_parent_notice(
          parent_row.id,
          row.student_id,
          'attendance_missed_three_days',
          'automation:attendance_missed_three_days:' || row.student_id::text || ':'
            || row.batch_id::text || ':' || coalesce(last_attended_at::text, 'never'),
          jsonb_build_object(
            'parent_name', parent_row.full_name,
            'student_name', row.full_name,
            'batch_name', row.batch_name,
            'from_date', (p_today - 3)::text,
            'to_date', latest_session_date::text
          )
        );
      end if;
    end loop;
  end loop;
end;
$$;

revoke all on function public.process_academy_notification_automations(date)
  from public, anon, authenticated;
grant execute on function public.process_academy_notification_automations(date) to postgres;

create or replace function public.run_academy_notification_automations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  academy_timezone text;
  local_today date;
begin
  select timezone into academy_timezone from public.academy_settings where id;
  academy_timezone := coalesce(academy_timezone, 'Asia/Kolkata');
  local_today := (now() at time zone academy_timezone)::date;
  perform public.process_academy_notification_automations(local_today);
end;
$$;

revoke all on function public.run_academy_notification_automations() from public, anon, authenticated;
grant execute on function public.run_academy_notification_automations() to postgres;

create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid)
from cron.job
where jobname = 'academy-notification-automations';
select cron.schedule(
  'academy-notification-automations',
  '0 * * * *',
  'select public.run_academy_notification_automations()'
);

insert into supabase_migrations.schema_migrations(version,name,statements) values ('202610130002','academy_notification_automations',array[$release_source$begin;

create table public.academy_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('holiday', 'special_event')),
  title text not null check (length(btrim(title)) between 2 and 120),
  event_date date not null,
  description text not null default '',
  status public.record_status not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index academy_events_active_date_idx
  on public.academy_events(event_date)
  where status = 'active';

alter table public.academy_events enable row level security;
create policy academy_events_staff_read on public.academy_events
  for select to authenticated using (public.is_admin_or_receptionist());
create policy academy_events_staff_write on public.academy_events
  for all to authenticated
  using (public.is_admin_or_receptionist())
  with check (public.is_admin_or_receptionist());
grant select, insert, update, delete on public.academy_events to authenticated;
create trigger set_updated_at before update on public.academy_events
  for each row execute function public.set_updated_at();

insert into public.notification_templates(name, template_key, channel, subject, body, status)
values
  ('Fee due today', 'fee_due_today', 'in_app', 'Fee due today',
    'Hi {parent_name}, {student_name}''s fee of {amount} for {batch_name} is due today ({due_date}). Please contact the academy if you have already paid.',
    'active'),
  ('Student birthday', 'student_birthday', 'in_app', 'Birthday wishes for {student_name}',
    'Please join us in wishing {student_name} a very happy birthday today!',
    'active'),
  ('Student birthday WhatsApp', 'student_birthday_whatsapp', 'whatsapp', 'Birthday wishes for {student_name}',
    'Hi {parent_name}, please join us in wishing {student_name} a very happy birthday today!',
    'active'),
  ('Coach birthday', 'coach_birthday', 'in_app', 'Happy birthday, {coach_name}!',
    'Wishing you a wonderful birthday, {coach_name}. Thank you for being part of Turf Academy!',
    'active'),
  ('Coach birthday WhatsApp', 'coach_birthday_whatsapp', 'whatsapp', 'Happy birthday, {coach_name}!',
    'Happy birthday, {coach_name}! Everyone at Turf Academy wishes you a wonderful day.',
    'active'),
  ('Student check-in', 'attendance_check_in', 'in_app', 'Student checked in',
    '{student_name} checked in at {event_time}.',
    'active'),
  ('Student check-out', 'attendance_check_out', 'in_app', 'Student checked out',
    '{student_name} checked out at {event_time}.',
    'active'),
  ('Academy holiday', 'academy_holiday', 'in_app', 'Academy holiday: {event_name}',
    '{event_name} is scheduled for {event_date}. {event_details}',
    'active'),
  ('Special academy event', 'academy_special_event', 'in_app', 'Academy event: {event_name}',
    'You are invited to {event_name} on {event_date}. {event_details}',
    'active'),
  ('Student marked absent', 'attendance_absent', 'in_app', 'Attendance alert for {student_name}',
    '{student_name} was marked absent from the {batch_name} session on {session_date}.',
    'active'),
  ('Three missed session days', 'attendance_missed_three_days', 'in_app', 'Attendance follow-up for {student_name}',
    'We have not recorded attendance for {student_name} during scheduled sessions from {from_date} to {to_date}. Please contact the academy if you need support.',
    'active')
on conflict (template_key) do nothing;

create or replace function public.queue_automated_parent_notice(
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
  where id = p_parent_id and status = 'active';
  if not found then return; end if;

  select * into template_row
  from public.notification_templates
  where template_key = p_template_key
    and channel = 'in_app'
    and status = 'active';
  if not found then return; end if;

  recipient := coalesce(nullif(parent_row.email, ''), nullif(parent_row.phone, ''), parent_row.id::text);
  rendered_subject := coalesce(template_row.subject, template_row.name);
  rendered_body := template_row.body;
  for placeholder in select key, value from jsonb_each_text(coalesce(p_values, '{}'::jsonb))
  loop
    rendered_subject := replace(rendered_subject, '{' || placeholder.key || '}', coalesce(placeholder.value, ''));
    rendered_body := replace(rendered_body, '{' || placeholder.key || '}', coalesce(placeholder.value, ''));
  end loop;

  insert into public.notifications(
    student_id, parent_id, channel, template_key, recipient, subject, body, status, sent_at, client_reference
  )
  values (
    p_student_id, p_parent_id, 'in_app', p_template_key, recipient,
    rendered_subject, rendered_body, 'sent', now(), p_reference
  )
  on conflict (client_reference) do nothing;
end;
$$;

revoke all on function public.queue_automated_parent_notice(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;

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
  where id = p_parent_id and status = 'active';
  if not found or not (select 'whatsapp' = any(notification_channels) from public.academy_settings where id) then
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

revoke all on function public.queue_automated_parent_whatsapp_notice(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.queue_automated_coach_notice(
  p_coach_id uuid,
  p_template_key text,
  p_reference text,
  p_values jsonb,
  p_channel text default 'in_app'
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  coach_row public.coaches;
  template_row public.notification_templates;
  rendered_subject text;
  rendered_body text;
  placeholder record;
  recipient text;
  delivery_status public.delivery_status;
begin
  select * into coach_row
  from public.coaches
  where id = p_coach_id and status = 'active' and profile_id is not null;
  if not found then return; end if;

  if p_channel = 'whatsapp' then
    if not (select 'whatsapp' = any(notification_channels) from public.academy_settings where id) then
      return;
    end if;
    recipient := nullif(coach_row.phone, '');
  elsif p_channel = 'in_app' then
    recipient := coalesce(nullif(coach_row.email, ''), nullif(coach_row.phone, ''), coach_row.id::text);
  else
    return;
  end if;
  if recipient is null then return; end if;

  select * into template_row
  from public.notification_templates
  where template_key = p_template_key and channel = p_channel and status = 'active';
  if not found then return; end if;

  rendered_subject := coalesce(template_row.subject, template_row.name);
  rendered_body := template_row.body;
  for placeholder in select key, value from jsonb_each_text(coalesce(p_values, '{}'::jsonb))
  loop
    rendered_subject := replace(rendered_subject, '{' || placeholder.key || '}', coalesce(placeholder.value, ''));
    rendered_body := replace(rendered_body, '{' || placeholder.key || '}', coalesce(placeholder.value, ''));
  end loop;

  delivery_status := case when p_channel = 'in_app' then 'sent'::public.delivery_status else 'queued'::public.delivery_status end;
  insert into public.notifications(
    coach_id, channel, template_key, recipient, subject, body, status, sent_at, client_reference
  )
  values (
    p_coach_id, p_channel, p_template_key, recipient, rendered_subject, rendered_body,
    delivery_status, case when p_channel = 'in_app' then now() else null end, p_reference
  )
  on conflict (client_reference) do nothing;
end;
$$;

revoke all on function public.queue_automated_coach_notice(uuid, text, text, jsonb, text)
  from public, anon, authenticated;

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
          'event_time', to_char(event_time at time zone 'Asia/Kolkata', 'HH12:MI AM'),
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
  after insert or update of check_out_at, status on public.attendance_records
  for each row execute function public.notify_parents_of_attendance();

create or replace function public.process_academy_notification_automations(p_today date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  row record;
  parent_row record;
  academy_currency text;
  academy_channels text[];
  last_attended_at timestamptz;
  latest_session_date date;
begin
  select currency_code, notification_channels into academy_currency, academy_channels
  from public.academy_settings where id;
  academy_currency := coalesce(academy_currency, 'INR');

  for row in
    select c.id, c.student_id, s.full_name, b.name as batch_name,
      c.due_date, balances.balance_amount
    from public.monthly_charges c
    join public.monthly_charge_balances balances on balances.id = c.id
    join public.students s on s.id = c.student_id and s.status = 'active'
    join public.enrollments e on e.id = c.enrollment_id and e.status = 'active'
    join public.batches b on b.id = e.batch_id
    where c.due_date = p_today and c.status <> 'waived' and balances.balance_amount > 0
  loop
    for parent_row in
      select p.id, p.full_name
      from public.student_parents sp
      join public.parents p on p.id = sp.parent_id
      where sp.student_id = row.student_id and p.status = 'active'
    loop
      perform public.queue_automated_parent_notice(
        parent_row.id,
        row.student_id,
        'fee_due_today',
        'automation:fee_due_today:' || row.id::text || ':' || p_today::text || ':' || parent_row.id::text,
        jsonb_build_object(
          'parent_name', parent_row.full_name,
          'student_name', row.full_name,
          'batch_name', row.batch_name,
          'amount', academy_currency || ' ' || to_char(row.balance_amount, 'FM999,999,990.00'),
          'due_date', row.due_date::text
        )
      );
    end loop;
  end loop;

  for row in
    select s.id, s.full_name
    from public.students s
    where s.status = 'active'
      and extract(month from s.date_of_birth) = extract(month from p_today)
      and extract(day from s.date_of_birth) = extract(day from p_today)
  loop
    for parent_row in
      select p.id, p.full_name
      from public.student_parents sp
      join public.parents p on p.id = sp.parent_id
      where sp.student_id = row.id and p.status = 'active'
    loop
      perform public.queue_automated_parent_notice(
        parent_row.id,
        row.id,
        'student_birthday',
        'automation:student_birthday:' || row.id::text || ':' || p_today::text || ':' || parent_row.id::text,
        jsonb_build_object('parent_name', parent_row.full_name, 'student_name', row.full_name)
      );
      if 'whatsapp' = any(coalesce(academy_channels, array[]::text[])) then
        perform public.queue_automated_parent_whatsapp_notice(
          parent_row.id,
          row.id,
          'student_birthday_whatsapp',
          'automation:student_birthday:whatsapp:' || row.id::text || ':' || p_today::text || ':' || parent_row.id::text,
          jsonb_build_object('parent_name', parent_row.full_name, 'student_name', row.full_name)
        );
      end if;
    end loop;
  end loop;

  for row in
    select c.id, c.full_name
    from public.coaches c
    where c.status = 'active'
      and c.profile_id is not null
      and c.date_of_birth is not null
      and extract(month from c.date_of_birth) = extract(month from p_today)
      and extract(day from c.date_of_birth) = extract(day from p_today)
  loop
    perform public.queue_automated_coach_notice(
      row.id,
      'coach_birthday',
      'automation:coach_birthday:' || row.id::text || ':' || p_today::text,
      jsonb_build_object('coach_name', row.full_name)
    );
    if 'whatsapp' = any(coalesce(academy_channels, array[]::text[])) then
      perform public.queue_automated_coach_notice(
        row.id,
        'coach_birthday_whatsapp',
        'automation:coach_birthday:whatsapp:' || row.id::text || ':' || p_today::text,
        jsonb_build_object('coach_name', row.full_name),
        'whatsapp'
      );
    end if;
  end loop;

  for row in
    select e.id, e.event_type, e.title, e.event_date, e.description
    from public.academy_events e
    where e.status = 'active' and e.event_date = p_today
  loop
    for parent_row in
      select distinct p.id, p.full_name
      from public.parents p
      join public.student_parents sp on sp.parent_id = p.id
      join public.enrollments enrollment on enrollment.student_id = sp.student_id
      join public.students s on s.id = enrollment.student_id and s.status = 'active'
      where p.status = 'active' and enrollment.status = 'active'
    loop
      perform public.queue_automated_parent_notice(
        parent_row.id,
        null,
        case row.event_type when 'holiday' then 'academy_holiday' else 'academy_special_event' end,
        'automation:' || row.event_type || ':' || row.id::text || ':' || row.event_date::text || ':' || parent_row.id::text,
        jsonb_build_object(
          'parent_name', parent_row.full_name,
          'event_name', row.title,
          'event_date', row.event_date::text,
          'event_details', nullif(row.description, '')
        )
      );
    end loop;
  end loop;

  for row in
    select distinct enrollment.student_id, enrollment.batch_id, s.full_name, b.name as batch_name
    from public.enrollments enrollment
    join public.students s on s.id = enrollment.student_id and s.status = 'active'
    join public.batches b on b.id = enrollment.batch_id
    where enrollment.status = 'active'
      and (
        select count(distinct session.session_date)
        from public.training_sessions session
        where session.batch_id = enrollment.batch_id
          and session.session_date between p_today - 3 and p_today - 1
          and session.status in ('upcoming', 'completed')
          and not exists (
            select 1 from public.attendance_records attendance
            where attendance.student_id = enrollment.student_id
              and attendance.batch_id = enrollment.batch_id
              and attendance.attendance_date = session.session_date
              and attendance.status in ('present', 'late', 'checked_out')
          )
      ) = 3
  loop
    select max(coalesce(attendance.check_in_at, attendance.created_at)) into last_attended_at
    from public.attendance_records attendance
    where attendance.student_id = row.student_id
      and attendance.batch_id = row.batch_id
      and attendance.status in ('present', 'late', 'checked_out');

    select max(session.session_date) into latest_session_date
    from public.training_sessions session
    where session.batch_id = row.batch_id
      and session.session_date between p_today - 3 and p_today - 1
      and session.status in ('upcoming', 'completed');

    for parent_row in
      select p.id, p.full_name
      from public.student_parents sp
      join public.parents p on p.id = sp.parent_id
      where sp.student_id = row.student_id and p.status = 'active'
    loop
      if not exists (
        select 1 from public.notifications n
        where n.student_id = row.student_id
          and n.parent_id = parent_row.id
          and n.template_key = 'attendance_missed_three_days'
          and n.created_at >= coalesce(last_attended_at, '-infinity'::timestamptz)
      ) then
        perform public.queue_automated_parent_notice(
          parent_row.id,
          row.student_id,
          'attendance_missed_three_days',
          'automation:attendance_missed_three_days:' || row.student_id::text || ':'
            || row.batch_id::text || ':' || coalesce(last_attended_at::text, 'never'),
          jsonb_build_object(
            'parent_name', parent_row.full_name,
            'student_name', row.full_name,
            'batch_name', row.batch_name,
            'from_date', (p_today - 3)::text,
            'to_date', latest_session_date::text
          )
        );
      end if;
    end loop;
  end loop;
end;
$$;

revoke all on function public.process_academy_notification_automations(date)
  from public, anon, authenticated;
grant execute on function public.process_academy_notification_automations(date) to postgres;

create or replace function public.run_academy_notification_automations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  academy_timezone text;
  local_today date;
begin
  select timezone into academy_timezone from public.academy_settings where id;
  academy_timezone := coalesce(academy_timezone, 'Asia/Kolkata');
  local_today := (now() at time zone academy_timezone)::date;
  perform public.process_academy_notification_automations(local_today);
end;
$$;

revoke all on function public.run_academy_notification_automations() from public, anon, authenticated;
grant execute on function public.run_academy_notification_automations() to postgres;

create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid)
from cron.job
where jobname = 'academy-notification-automations';
select cron.schedule(
  'academy-notification-automations',
  '0 * * * *',
  'select public.run_academy_notification_automations()'
);

commit;
$release_source$]);
-- Source: 202610130005_birthday_email_templates.sql

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

insert into supabase_migrations.schema_migrations(version,name,statements) values ('202610130005','birthday_email_templates',array[$release_source$begin;

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
$release_source$]);
-- Source: 202610130006_turf_academy_birthday_copy.sql

update public.notification_templates
set body = 'Turf Academy wishes {student_name} a very happy birthday! We hope your day is full of fun and cricket.'
where template_key = 'student_birthday'
  and channel = 'in_app';

update public.notification_templates
set body = 'Hi {parent_name}, Turf Academy wishes {student_name} a very happy birthday! We hope the day is full of fun and cricket.'
where template_key in ('student_birthday_email', 'student_birthday_whatsapp')
  and channel in ('email', 'whatsapp');

update public.notification_templates
set body = 'Turf Academy wishes you a wonderful birthday, {coach_name}! Thank you for inspiring our players.'
where template_key = 'coach_birthday'
  and channel = 'in_app';

update public.notification_templates
set body = 'Hello {coach_name}, Turf Academy wishes you a wonderful birthday! Thank you for inspiring our players.'
where template_key = 'coach_birthday_email'
  and channel = 'email';

update public.notification_templates
set body = 'Happy birthday, {coach_name}! Turf Academy wishes you a wonderful day.'
where template_key = 'coach_birthday_whatsapp'
  and channel = 'whatsapp';

insert into supabase_migrations.schema_migrations(version,name,statements) values ('202610130006','turf_academy_birthday_copy',array[$release_source$begin;

update public.notification_templates
set body = 'Turf Academy wishes {student_name} a very happy birthday! We hope your day is full of fun and cricket.'
where template_key = 'student_birthday'
  and channel = 'in_app';

update public.notification_templates
set body = 'Hi {parent_name}, Turf Academy wishes {student_name} a very happy birthday! We hope the day is full of fun and cricket.'
where template_key in ('student_birthday_email', 'student_birthday_whatsapp')
  and channel in ('email', 'whatsapp');

update public.notification_templates
set body = 'Turf Academy wishes you a wonderful birthday, {coach_name}! Thank you for inspiring our players.'
where template_key = 'coach_birthday'
  and channel = 'in_app';

update public.notification_templates
set body = 'Hello {coach_name}, Turf Academy wishes you a wonderful birthday! Thank you for inspiring our players.'
where template_key = 'coach_birthday_email'
  and channel = 'email';

update public.notification_templates
set body = 'Happy birthday, {coach_name}! Turf Academy wishes you a wonderful day.'
where template_key = 'coach_birthday_whatsapp'
  and channel = 'whatsapp';

commit;
$release_source$]);
-- Source: 202610130007_student_birthday_in_app_greeting.sql

update public.notification_templates
set
  subject = '🎉 Happy Birthday, {student_name}! 🎂',
  body = E'Wishing you a fantastic birthday!\nMay your day be filled with fun, joy and cricket! 🏏\nFrom Turf Cricket Academy'
where template_key = 'student_birthday'
  and channel = 'in_app';

insert into supabase_migrations.schema_migrations(version,name,statements) values ('202610130007','student_birthday_in_app_greeting',array[$release_source$begin;

update public.notification_templates
set
  subject = '🎉 Happy Birthday, {student_name}! 🎂',
  body = E'Wishing you a fantastic birthday!\nMay your day be filled with fun, joy and cricket! 🏏\nFrom Turf Cricket Academy'
where template_key = 'student_birthday'
  and channel = 'in_app';

commit;
$release_source$]);
select cron.alter_job(jobid, active := false) from cron.job where jobname='academy-notification-automations';
commit;