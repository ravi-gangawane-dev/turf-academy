-- Run with `supabase test db` against a migrated database and active admin test profile.
-- All event, charge, attendance, and notification fixtures roll back.
begin;
select plan(14);

select set_config('request.jwt.claim.sub', (
  select id::text
  from public.profiles
  where role = 'admin' and is_active and status = 'active'
  limit 1
), true);
set local role authenticated;

create temporary table notification_automation_fixture (
  today date not null,
  student_id uuid not null,
  parent_id uuid not null,
  batch_id uuid not null,
  enrollment_id uuid not null,
  event_id uuid not null,
  coach_id uuid not null
);

do $$
<<fixture>>
declare
  fixture_key text := replace(extensions.gen_random_uuid()::text, '-', '');
  local_today date;
  academy_timezone text;
  fee_plan_id uuid;
  batch_id uuid;
  student_id uuid;
  parent_id uuid;
  enrollment_id uuid;
  event_id uuid;
  coach_id uuid;
begin
  if not public.is_admin() then raise exception 'An active admin test profile is required'; end if;

  select timezone into academy_timezone from public.academy_settings where id;
  local_today := (now() at time zone coalesce(academy_timezone, 'Asia/Kolkata'))::date;

  insert into public.fee_plans(name, monthly_fee)
  values ('Notification automation plan ' || fixture_key, 1000)
  returning id into fee_plan_id;

  insert into public.batches(code, name, capacity, fee_plan_id)
  values ('NOTICE-' || fixture_key, 'Notification automation batch', 10, fee_plan_id)
  returning id into batch_id;

  student_id := public.create_student_profile(jsonb_build_object(
    'full_name', 'Automation notification student',
    'date_of_birth', make_date(2000, extract(month from local_today)::integer, extract(day from local_today)::integer)::text,
    'parent_name', 'Automation notification parent',
    'parent_phone', '9000000000',
    'joined_on', local_today,
    'batch_id', batch_id::text
  ));

  select sp.parent_id into strict parent_id
  from public.student_parents sp
  where sp.student_id = fixture.student_id;

  select e.id into strict enrollment_id
  from public.enrollments e
  where e.student_id = fixture.student_id and e.batch_id = fixture.batch_id and e.status = 'active';

  insert into public.monthly_charges(enrollment_id, student_id, charge_month, due_date, base_amount)
  values (enrollment_id, student_id, date_trunc('month', local_today)::date, local_today, 1000);

  insert into public.academy_events(event_type, title, event_date, description, created_by)
  values ('holiday', 'Automation test holiday', local_today, 'Academy closed', auth.uid())
  returning id into event_id;

  insert into public.academy_events(event_type, title, event_date, description, created_by)
  values ('special_event', 'Automation test event', local_today, 'Academy event', auth.uid());

  insert into public.coaches(profile_id, employee_code, full_name, phone, date_of_birth)
  values (auth.uid(), 'NOTICE-' || fixture_key, 'Automation notification coach', '9000000001', local_today)
  returning id into coach_id;

  update public.academy_settings
  set notification_channels = array_append(notification_channels, 'whatsapp')
  where id;

  insert into public.training_sessions(batch_id, title, session_date, start_time, end_time, venue, status)
  select batch_id, 'Missed session ' || session_day::text, session_day, time '06:00', time '08:00',
    'Main ground', 'completed'
  from generate_series(local_today - 3, local_today - 1, interval '1 day') as sessions(session_day);

  insert into notification_automation_fixture
  values (local_today, student_id, parent_id, batch_id, enrollment_id, event_id, coach_id);
end;
$$;

reset role;
select public.process_academy_notification_automations(today)
from notification_automation_fixture;

select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.student_id = f.student_id
    where n.parent_id = f.parent_id and n.template_key = 'fee_due_today' and n.status = 'sent'),
  1::bigint,
  'a due balance queues one fee reminder'
);
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.student_id = f.student_id
    where n.parent_id = f.parent_id and n.template_key = 'student_birthday'),
  1::bigint,
  'a student birthday queues a parent notification'
);
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.student_id = f.student_id
    where n.parent_id = f.parent_id and n.template_key = 'student_birthday_whatsapp'
      and n.channel = 'whatsapp' and n.status = 'queued'),
  1::bigint,
  'a student birthday queues a WhatsApp message when enabled'
);
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.coach_id = f.coach_id
    where n.template_key = 'coach_birthday' and n.channel = 'in_app' and n.status = 'sent'),
  1::bigint,
  'a coach birthday queues an in-app notice for the coach account'
);
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.coach_id = f.coach_id
    where n.template_key = 'coach_birthday_whatsapp' and n.channel = 'whatsapp' and n.status = 'queued'),
  1::bigint,
  'a coach birthday queues WhatsApp when enabled'
);
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.parent_id = f.parent_id
    where n.student_id is null and n.template_key = 'academy_holiday'),
  1::bigint,
  'an active holiday queues a parent notification'
);
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.parent_id = f.parent_id
    where n.student_id is null and n.template_key = 'academy_special_event'),
  1::bigint,
  'an active special event queues a parent notification'
);
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.student_id = f.student_id
    where n.parent_id = f.parent_id and n.template_key = 'attendance_missed_three_days'),
  1::bigint,
  'three consecutive scheduled days without attendance queues a reminder'
);
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.parent_id = f.parent_id
    where (n.student_id = f.student_id or n.student_id is null)
      and n.template_key in ('fee_due_today', 'student_birthday', 'academy_holiday', 'academy_special_event', 'attendance_missed_three_days')
      and n.channel = 'in_app' and n.status = 'sent' and n.body not like '%{%' and n.subject not like '%{%'),
  5::bigint,
  'automation messages use active in-app templates with rendered placeholders'
);

set local role authenticated;
insert into public.attendance_records(student_id, batch_id, attendance_date, status, recorded_by)
select student_id, batch_id, today, 'absent', auth.uid()
from notification_automation_fixture;
reset role;

select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.student_id = f.student_id
    where n.parent_id = f.parent_id and n.template_key = 'attendance_absent' and n.status = 'sent'),
  1::bigint,
  'marking attendance absent queues a parent notification'
);

select public.process_academy_notification_automations(today)
from notification_automation_fixture;
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.student_id = f.student_id
    where n.parent_id = f.parent_id and n.template_key = 'attendance_missed_three_days'),
  1::bigint,
  'rerunning the scheduler does not duplicate a missed-session alert'
);
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.student_id = f.student_id
    where n.parent_id = f.parent_id and n.template_key = 'student_birthday_whatsapp'),
  1::bigint,
  'rerunning the scheduler does not duplicate a student WhatsApp birthday'
);
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.coach_id = f.coach_id
    where n.template_key = 'coach_birthday'),
  1::bigint,
  'rerunning the scheduler does not duplicate a coach in-app birthday'
);
select is(
  (select count(*) from public.notifications n join notification_automation_fixture f on n.coach_id = f.coach_id
    where n.template_key = 'coach_birthday_whatsapp'),
  1::bigint,
  'rerunning the scheduler does not duplicate a coach WhatsApp birthday'
);

select * from finish();
rollback;
