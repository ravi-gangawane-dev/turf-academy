begin;

-- Phase 2 coach attendance unification (C-07).
--
-- The coach UI now records through the hardened shared entry points
-- (attendance_check_in / attendance_check_out, hardened in
-- 202610230004_attendance_integrity_p0.sql). Those functions already permit
-- assigned coaches through coach_has_batch(), so the two coach-only RPCs
-- below are removed: both trusted client-supplied business dates, check-in
-- timestamps and statuses, carried no idempotency key, and
-- coach_check_out_student had no open-check-in or double-check-out guard --
-- exactly the defects C-01..C-03 closed on the shared path.
--
-- coach_mark_batch_attendance stays (bulk "mark unmarked students present"
-- has no shared equivalent) but stops trusting the client-computed UTC date:
-- with no explicit date it derives the business date in the academy
-- timezone, and present-marking classifies late arrivals with the same grace
-- expression attendance_check_in uses. The parameter list is unchanged, so
-- the existing grant keeps applying.

create or replace function public.coach_mark_batch_attendance(
  p_batch_id uuid,
  p_student_ids uuid[],
  p_attendance_date date default null,
  p_status public.attendance_status default 'present'
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
  business_date date;
  zone text;
  grace integer;
  starts_at time;
begin
  if public.current_user_role() <> 'coach' or not public.coach_has_batch(p_batch_id) then
    raise exception 'coach_batch_access_denied' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_student_ids), 0) = 0 then
    raise exception 'students_required';
  end if;

  select timezone, attendance_grace_minutes into zone, grace from public.academy_settings where id;
  zone := coalesce(zone, 'Asia/Kolkata');
  business_date := coalesce(p_attendance_date, (now() at time zone zone)::date);
  select start_time into starts_at from public.batches where id = p_batch_id;

  if exists (
    select 1 from unnest(p_student_ids) requested(student_id)
    where not exists (
      select 1 from public.enrollments enrollment
      where enrollment.student_id = requested.student_id
        and enrollment.batch_id = p_batch_id
        and enrollment.status = 'active'
        and enrollment.valid_from <= business_date
        and (enrollment.valid_till is null or enrollment.valid_till >= business_date)
    )
  ) then
    raise exception 'student_not_actively_enrolled' using errcode = '42501';
  end if;

  insert into public.attendance_records (
    student_id, batch_id, attendance_date, check_in_at, status, source, recorded_by
  )
  select distinct student_id, p_batch_id, business_date,
    case when p_status = 'absent' then null else now() end,
    case
      when p_status = 'present'
        and starts_at is not null
        and (now() at time zone zone) > business_date + starts_at + make_interval(mins => coalesce(grace, 10))
        then 'late'::public.attendance_status
      else p_status
    end,
    'bulk', auth.uid()
  from unnest(p_student_ids) requested(student_id)
  on conflict (student_id, batch_id, attendance_date) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.coach_mark_batch_attendance(uuid, uuid[], date, public.attendance_status) from public;
grant execute on function public.coach_mark_batch_attendance(uuid, uuid[], date, public.attendance_status) to authenticated;

-- The app no longer calls these; no other caller may reproduce their
-- client-controlled timestamps now that they are gone.
drop function if exists public.coach_check_in_student(uuid, uuid, date, timestamptz, public.attendance_status, text, text);
drop function if exists public.coach_check_out_student(uuid, timestamptz, text);

commit;
