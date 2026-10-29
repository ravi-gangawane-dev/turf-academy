-- Run as postgres on a disposable/staging Supabase database migrated through
-- 202610230002, with an active admin test profile and seeded automation templates.
-- The transaction rolls back all attendance and notification fixtures.
begin;

select set_config('request.jwt.claim.sub', (
  select id::text
  from public.profiles
  where role = 'admin' and is_active and status = 'active'
  limit 1
), true);
set local role authenticated;

do $$
declare
  fixture_key text := replace(extensions.gen_random_uuid()::text, '-', '');
  business_date date;
  timezone_name text;
  fee_plan_id uuid;
  batch_id uuid;
  student_id uuid;
  parent_id uuid;
  attendance public.attendance_records;
  notification_count bigint;
begin
  if not public.is_admin() then
    raise exception 'An active admin test profile is required';
  end if;

  select timezone into timezone_name
  from public.academy_settings
  where id;
  business_date := (now() at time zone coalesce(timezone_name, 'Asia/Kolkata'))::date;

  insert into public.fee_plans(name, monthly_fee)
  values ('Attendance notification test ' || fixture_key, 1000)
  returning id into fee_plan_id;

  insert into public.batches(code, name, capacity, fee_plan_id)
  values ('ATT-NOTIFY-' || fixture_key, 'Attendance notification test', 1, fee_plan_id)
  returning id into batch_id;

  student_id := public.create_student_profile(jsonb_build_object(
    'full_name', 'Attendance notification student',
    'date_of_birth', '2014-01-01',
    'parent_name', 'Attendance notification parent',
    'parent_phone', '9000000000',
    'joined_on', business_date,
    'batch_id', batch_id::text
  ));

  select sp.parent_id into strict parent_id
  from public.student_parents sp
  where sp.student_id = student_id;

  select public.attendance_check_in(
    qr.public_token,
    batch_id,
    'manual',
    'attendance-notification-check-in-' || fixture_key
  ) into strict attendance
  from public.qr_profiles qr
  where qr.student_id = student_id and qr.active;

  select count(*) into notification_count
  from public.notifications n
  where n.student_id = student_id
    and n.parent_id = parent_id
    and n.template_key = 'attendance_check_in'
    and n.channel = 'in_app'
    and n.subject = 'Student checked in'
    and n.body like 'Attendance notification student checked in at %'
    and n.status = 'sent';
  if notification_count <> 1 then
    raise exception 'Check-in should create exactly one in-app notification; found %', notification_count;
  end if;

  attendance := public.attendance_check_out(
    attendance.id,
    'attendance-notification-check-out-' || fixture_key
  );

  select count(*) into notification_count
  from public.notifications n
  where n.student_id = student_id
    and n.parent_id = parent_id
    and n.template_key = 'attendance_check_out'
    and n.channel = 'in_app'
    and n.subject = 'Student checked out'
    and n.body like 'Attendance notification student checked out at %'
    and n.status = 'sent';
  if notification_count <> 1 then
    raise exception 'Check-out should create exactly one in-app notification; found %', notification_count;
  end if;

  -- C-01: a genuine second check-out with a different key is rejected instead of
  -- silently re-updating an already-closed record.
  begin
    perform public.attendance_check_out(
      attendance.id,
      'attendance-notification-check-out-retry-' || fixture_key
    );
    raise exception 'Repeated check-out with a different key was not rejected';
  exception when others then
    if sqlstate <> '23505' or sqlerrm not like '%student_already_checked_out%' then raise; end if;
  end;

  -- A replay carrying the original check-out key succeeds and returns the
  -- committed row without rewriting it.
  attendance := public.attendance_check_out(
    attendance.id,
    'attendance-notification-check-out-' || fixture_key
  );
  if attendance.check_out_at is null or attendance.status <> 'checked_out' then
    raise exception 'Idempotent check-out replay did not return the committed row';
  end if;

  select count(*) into notification_count
  from public.notifications n
  where n.student_id = student_id
    and n.parent_id = parent_id
    and n.template_key = 'attendance_check_out';
  if notification_count <> 1 then
    raise exception 'Repeated check-out must not duplicate its notification; found %', notification_count;
  end if;

  insert into public.attendance_records(student_id, batch_id, attendance_date, status)
    values (student_id, batch_id, business_date - 1, 'absent') returning * into attendance;
  update public.attendance_records set check_in_at = now(), status = 'present'
    where id = attendance.id;
  update public.attendance_records set check_in_at = check_in_at + interval '1 minute'
    where id = attendance.id;
  select count(*) into notification_count from public.notifications n
    where n.client_reference = 'attendance:' || attendance.id::text || ':' || parent_id::text || ':attendance_check_in';
  if notification_count <> 1 then
    raise exception 'Update-based check-in must notify once; timestamp correction must not duplicate';
  end if;

  -- Trusted generators are deliberately not callable by authenticated clients.
  execute 'reset role';
  update public.academy_settings set notification_channels = array['in_app', 'email', 'whatsapp'];
  update public.parents p set email = 'fixture@example.test',
    communication_preferences = '{"email":false,"whatsapp":false}'
    where p.id = parent_id;
  perform public.queue_automated_parent_whatsapp_notice(parent_id, student_id,
    'student_birthday_whatsapp', 'optout-whatsapp-' || fixture_key, '{}'::jsonb);
  perform public.queue_automated_parent_notice(parent_id, student_id,
    'student_birthday', 'optout-birthday-' || fixture_key, '{}'::jsonb);
  if exists(select 1 from public.notifications n where n.client_reference in (
    'optout-whatsapp-' || fixture_key, 'optout-birthday-' || fixture_key || ':email')) then
    raise exception 'Automated birthday generation ignored opt-out';
  end if;
  update public.parents p set communication_preferences = '{"email":true,"whatsapp":true}'
    where p.id = parent_id;
  perform public.queue_automated_parent_whatsapp_notice(parent_id, student_id,
    'student_birthday_whatsapp', 'allowed-whatsapp-' || fixture_key, '{}'::jsonb);
  perform public.queue_automated_parent_notice(parent_id, student_id,
    'student_birthday', 'allowed-birthday-' || fixture_key, '{}'::jsonb);
  if (select count(*) from public.notifications n where n.client_reference in (
    'allowed-whatsapp-' || fixture_key, 'allowed-birthday-' || fixture_key || ':email')) <> 2 then
    raise exception 'Eligible birthday notices were not queued';
  end if;
end;
$$;

rollback;
