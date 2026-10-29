-- Run against the linked test database inside one transaction. Every fixture is rolled back.
-- Phase 2 (C-07): coach attendance records through the hardened shared RPCs, coach bulk
-- marking on the academy business date, and the removal of the legacy coach-only entry points.
begin;
create temporary table ch_fixture (name text primary key, id uuid) on commit drop;

-- The legacy client-trusted entry points must be gone before any scenario runs.
do $$
begin
  if to_regprocedure('public.coach_check_in_student(uuid,uuid,date,timestamptz,public.attendance_status,text,text)') is not null
     or to_regprocedure('public.coach_check_out_student(uuid,timestamptz,text)') is not null then
    raise exception 'Legacy coach attendance RPCs must be dropped';
  end if;
end $$;

-- Fixtures: plan, batch, five students, enrollments, and a coach identity.
do $$
declare
  p uuid; b uuid;
  s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid;
  suffix text := gen_random_uuid()::text;
begin
  insert into public.fee_plans(name,monthly_fee,duration_months) values('CH plan '||suffix,1000,1) returning id into p;
  insert into public.batches(code,name,capacity,fee_plan_id) values('CH-'||suffix,'CH batch',20,p) returning id into b;
  insert into public.students(student_code,full_name,date_of_birth) values('CH-S1-'||suffix,'CH One '||suffix,'2014-01-01') returning id into s1;
  insert into public.students(student_code,full_name,date_of_birth) values('CH-S2-'||suffix,'CH Two '||suffix,'2014-02-02') returning id into s2;
  insert into public.students(student_code,full_name,date_of_birth) values('CH-S3-'||suffix,'CH Three '||suffix,'2014-03-03') returning id into s3;
  insert into public.students(student_code,full_name,date_of_birth) values('CH-S4-'||suffix,'CH Four '||suffix,'2014-04-04') returning id into s4;
  insert into public.students(student_code,full_name,date_of_birth) values('CH-S5-'||suffix,'CH Five '||suffix,'2014-05-05') returning id into s5;
  insert into public.enrollments(student_id,batch_id,fee_plan_id,valid_from,monthly_fee)
    select student_id, b, p, current_date - 30, 1000 from unnest(array[s1,s2,s3,s4,s5]) student_id;
  insert into ch_fixture values('plan',p),('batch',b),('s1',s1),('s2',s2),('s3',s3),('s4',s4),('s5',s5);
end $$;

do $$
declare
  coach_profile uuid; coach_id uuid;
  suffix text := gen_random_uuid()::text;
  chosen_zone text;
begin
  -- Coach identity: reuse an active coach linked to a profile, or attach one to the
  -- seeded active coach profile.
  select c.profile_id, c.id into coach_profile, coach_id
  from public.coaches c
  join public.profiles p on p.id = c.profile_id
  where p.role = 'coach' and p.is_active and p.status = 'active' and c.status = 'active'
  limit 1;
  if coach_profile is null then
    select id into coach_profile from public.profiles where role='coach' and is_active and status='active' limit 1;
    if coach_profile is null then raise exception 'Active coach test profile required'; end if;
    insert into public.coaches(profile_id, employee_code, full_name, phone)
      values (coach_profile, 'COACH-HARD-'||suffix, 'Coach hardening fixture', '9000000011')
      returning id into coach_id;
  end if;
  insert into ch_fixture values('coach_profile',coach_profile),('coach',coach_id);
  insert into public.batch_coaches(batch_id, coach_id, is_primary)
    values ((select id from ch_fixture where name='batch'), coach_id, true);

  -- Pick a timezone whose local clock is already past a fixed 12:00 start so the late
  -- classification is deterministic at any run time; grace 0 (its documented minimum).
  select z into chosen_zone
  from unnest(array['Pacific/Kiritimati','Pacific/Apia','Pacific/Midway','UTC','Asia/Kolkata']) z
  where ((now() at time zone z)::time > '12:00:00')
  limit 1;
  if chosen_zone is null then raise exception 'No usable test timezone'; end if;
  update public.academy_settings set timezone = chosen_zone, attendance_grace_minutes = 0 where id;
  update public.batches set start_time = '12:00:00' where id = (select id from ch_fixture where name='batch');
end $$;

-- Scenario A: the assigned coach bulk-marks on the academy business date with late
-- classification and provenance, and the repeat call is a no-op.
select set_config('request.jwt.claim.sub', (select id::text from ch_fixture where name='coach_profile'), true);
set local role authenticated;
do $$
declare
  b uuid := (select id from ch_fixture where name='batch');
  s1 uuid := (select id from ch_fixture where name='s1');
  s2 uuid := (select id from ch_fixture where name='s2');
  coach uuid := (select id from ch_fixture where name='coach_profile');
  biz date := (select (now() at time zone (select timezone from public.academy_settings where id))::date);
  marked integer; repeated integer; r record;
begin
  marked := public.coach_mark_batch_attendance(b, array[s1,s2]);
  if marked <> 2 then raise exception 'Bulk marking must insert both fixture students, got %', marked; end if;
  for r in select * from public.attendance_records where batch_id = b and student_id in (s1,s2) loop
    if r.attendance_date <> biz then raise exception 'Bulk attendance must use the academy business date %, got %', biz, r.attendance_date; end if;
    if r.status <> 'late' then raise exception 'Present marking after grace must classify late, got %', r.status; end if;
    if r.check_in_at is null then raise exception 'Bulk present marking must record a check-in timestamp'; end if;
    if r.source <> 'bulk' then raise exception 'Bulk marking must record source bulk, got %', r.source; end if;
    if r.recorded_by is distinct from coach then raise exception 'Bulk marking must record the acting coach'; end if;
  end loop;
  repeated := public.coach_mark_batch_attendance(b, array[s1,s2]);
  if repeated <> 0 then raise exception 'Repeat bulk marking must be a no-op, inserted %', repeated; end if;
end $$;

-- Scenario B: an explicit historical date is still honoured by bulk marking.
do $$
declare
  b uuid := (select id from ch_fixture where name='batch');
  s2 uuid := (select id from ch_fixture where name='s2');
  past date := current_date - 2;
  marked integer;
begin
  -- s2 already holds today's row; a past date is a different slot.
  delete from public.attendance_records where student_id = s2 and attendance_date = past;
  marked := public.coach_mark_batch_attendance(b, array[s2], past);
  if marked <> 1 then raise exception 'Explicit-date bulk marking must insert one row, got %', marked; end if;
  if (select attendance_date from public.attendance_records where student_id = s2 and attendance_date = past) <> past then
    raise exception 'Explicit bulk date must be preserved';
  end if;
end $$;

-- Scenario C: with the assignment removed the same coach is rejected by both the bulk
-- path and the hardened single-record RPCs, and a staff role cannot bulk-mark.
-- Stash the open record id first: once the link is gone the coach's own RLS read cannot
-- see it, which is exactly what the scenario verifies on the server side.
insert into ch_fixture(name, id)
select 's1_open', id from public.attendance_records
where student_id = (select id from ch_fixture where name='s1')
  and batch_id = (select id from ch_fixture where name='batch')
order by attendance_date desc limit 1;
delete from public.batch_coaches
where batch_id = (select id from ch_fixture where name='batch')
  and coach_id = (select id from ch_fixture where name='coach');
do $$
declare
  b uuid := (select id from ch_fixture where name='batch');
  s1 uuid := (select id from ch_fixture where name='s1');
  s3 uuid := (select id from ch_fixture where name='s3');
  target uuid := (select id from ch_fixture where name='s1_open');
begin
  begin
    perform public.coach_mark_batch_attendance(b, array[s1]);
    raise exception 'Unassigned coach unexpectedly bulk-marked attendance';
  exception when insufficient_privilege then
    if sqlerrm <> 'coach_batch_access_denied' then raise; end if;
  end;
  begin
    perform public.attendance_check_in(p_student_id => s3, p_batch_id => b, p_source => 'manual', p_idempotency_key => 'ch-denied-in');
    raise exception 'Unassigned coach unexpectedly checked a student in';
  exception when insufficient_privilege then
    if sqlerrm <> 'insufficient_privilege' then raise; end if;
  end;
  if target is null then raise exception 'Fixture open record missing for the denial scenario'; end if;
  begin
    perform public.attendance_check_out(target, 'ch-denied-out');
    raise exception 'Unassigned coach unexpectedly checked a student out';
  exception when insufficient_privilege then
    if sqlerrm <> 'insufficient_privilege' then raise; end if;
  end;
end $$;
reset role;

insert into public.batch_coaches(batch_id, coach_id, is_primary)
values ((select id from ch_fixture where name='batch'), (select id from ch_fixture where name='coach'), true);

select set_config('request.jwt.claim.sub', (select id::text from public.profiles where role='admin' and is_active and status='active' limit 1), true);
set local role authenticated;
do $$
declare b uuid := (select id from ch_fixture where name='batch');
begin
  begin
    perform public.coach_mark_batch_attendance(b, array[(select id from ch_fixture where name='s1')]);
    raise exception 'Staff role unexpectedly used the coach bulk path';
  exception when insufficient_privilege then
    if sqlerrm <> 'coach_batch_access_denied' then raise; end if;
  end;
end $$;
reset role;

-- Scenario D: the coach manual in/out flow through the hardened RPCs -- late
-- classification, idempotent replay with the same key, duplicate and double-check-out
-- rejection, and check-out replay returning the committed row.
select set_config('request.jwt.claim.sub', (select id::text from ch_fixture where name='coach_profile'), true);
set local role authenticated;
do $$
declare
  b uuid := (select id from ch_fixture where name='batch');
  s3 uuid := (select id from ch_fixture where name='s3');
  biz date := (select (now() at time zone (select timezone from public.academy_settings where id))::date);
  first_in public.attendance_records; replay_in public.attendance_records;
  checked_out public.attendance_records; replay_out public.attendance_records;
begin
  first_in := public.attendance_check_in(p_student_id => s3, p_batch_id => b, p_source => 'manual', p_idempotency_key => 'ch-manual-in');
  if first_in.attendance_date <> biz then raise exception 'Manual check-in must use the business date'; end if;
  if first_in.status <> 'late' then raise exception 'Manual check-in after grace must classify late, got %', first_in.status; end if;
  if first_in.source <> 'manual' then raise exception 'Manual check-in must record source manual, got %', first_in.source; end if;

  replay_in := public.attendance_check_in(p_student_id => s3, p_batch_id => b, p_source => 'manual', p_idempotency_key => 'ch-manual-in');
  if replay_in.id <> first_in.id then raise exception 'Same-key replay must return the committed row'; end if;

  begin
    perform public.attendance_check_in(p_student_id => s3, p_batch_id => b, p_source => 'manual', p_idempotency_key => 'ch-manual-other');
    raise exception 'A second check-in with a new key must be rejected';
  exception when duplicate_object then
    if sqlerrm <> 'attendance_already_recorded' then raise; end if;
  end;

  checked_out := public.attendance_check_out(first_in.id, 'ch-manual-out');
  if checked_out.check_out_at is null or checked_out.status <> 'checked_out' then
    raise exception 'Check-out must close the open record';
  end if;
  replay_out := public.attendance_check_out(first_in.id, 'ch-manual-out');
  if replay_out.check_out_at is distinct from checked_out.check_out_at then
    raise exception 'Same-key check-out replay must return the committed row';
  end if;
  begin
    perform public.attendance_check_out(first_in.id, 'ch-manual-out-other');
    raise exception 'A second check-out with a new key must be rejected';
  exception when duplicate_object then
    if sqlerrm <> 'student_already_checked_out' then raise; end if;
  end;
end $$;

-- Scenario E: bulk absent leaves no check-in, and the hardened check-out refuses it.
do $$
declare
  b uuid := (select id from ch_fixture where name='batch');
  s5 uuid := (select id from ch_fixture where name='s5');
  target uuid;
begin
  if public.coach_mark_batch_attendance(b, array[s5], null, 'absent') <> 1 then
    raise exception 'Bulk absent marking must insert one row';
  end if;
  select id into target from public.attendance_records where student_id = s5 and batch_id = b;
  if (select check_in_at from public.attendance_records where id = target) is not null then
    raise exception 'Bulk absent must not fabricate a check-in timestamp';
  end if;
  begin
    perform public.attendance_check_out(target, 'ch-absent-out');
    raise exception 'Check-out without an open check-in must be rejected';
  exception when invalid_text_representation then
    if sqlerrm <> 'open_check_in_required' then raise; end if;
  end;
end $$;

-- Scenario F: the QR scan path -- token resolution, idempotent replay, and check-out.
reset role;
insert into public.qr_profiles(student_id, public_token, active)
values ((select id from ch_fixture where name='s4'), lpad((select id::text from ch_fixture where name='s4'), 48, 'c'), true);
select set_config('request.jwt.claim.sub', (select id::text from ch_fixture where name='coach_profile'), true);
set local role authenticated;
do $$
declare
  b uuid := (select id from ch_fixture where name='batch');
  s4 uuid := (select id from ch_fixture where name='s4');
  token text := lpad(s4::text, 48, 'c');
  scanned public.attendance_records; replay public.attendance_records;
begin
  scanned := public.attendance_check_in(p_qr_token => token, p_batch_id => b, p_source => 'qr', p_idempotency_key => 'ch-qr-in');
  if scanned.student_id <> s4 then raise exception 'QR scan must resolve the student from the token'; end if;
  if scanned.source <> 'qr' then raise exception 'QR scan must record source qr, got %', scanned.source; end if;
  replay := public.attendance_check_in(p_qr_token => token, p_batch_id => b, p_source => 'qr', p_idempotency_key => 'ch-qr-in');
  if replay.id <> scanned.id then raise exception 'QR replay with the same key must return the committed row'; end if;
  if public.attendance_check_out(scanned.id, 'ch-qr-out').status <> 'checked_out' then
    raise exception 'Scanning an open record must be able to check the student out';
  end if;
end $$;
reset role;

commit;
