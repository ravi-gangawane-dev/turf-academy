begin;

create or replace function public.attendance_check_in(
  p_qr_token text,
  p_batch_id uuid,
  p_source text default 'qr',
  p_idempotency_key text default null
) returns public.attendance_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  student uuid;
  result public.attendance_records;
begin
  if not (public.is_admin_or_receptionist() or public.coach_has_batch(p_batch_id)) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select student_id into strict student
  from public.qr_profiles
  where public_token = p_qr_token and active;

  if not exists (
    select 1 from public.enrollments
    where student_id = student and batch_id = p_batch_id and status = 'active'
      and valid_from <= current_date and (valid_till is null or valid_till >= current_date)
  ) then
    raise exception 'student_not_enrolled' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.attendance_records
    where student_id = student and batch_id = p_batch_id and attendance_date = current_date
  ) then
    raise exception 'attendance_already_recorded';
  end if;

  insert into public.attendance_records (
    student_id, batch_id, attendance_date, check_in_at, status, source,
    idempotency_key, recorded_by
  ) values (
    student, p_batch_id, current_date, now(), 'present', p_source,
    p_idempotency_key, auth.uid()
  ) returning * into result;

  return result;
end;
$$;

create or replace function public.coach_mark_batch_attendance(
  p_batch_id uuid,
  p_student_ids uuid[],
  p_attendance_date date default current_date,
  p_status public.attendance_status default 'present'
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if public.current_user_role() <> 'coach' or not public.coach_has_batch(p_batch_id) then
    raise exception 'coach_batch_access_denied' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_student_ids), 0) = 0 then
    raise exception 'students_required';
  end if;
  if exists (
    select 1 from unnest(p_student_ids) requested(student_id)
    where not exists (
      select 1 from public.enrollments enrollment
      where enrollment.student_id = requested.student_id
        and enrollment.batch_id = p_batch_id
        and enrollment.status = 'active'
        and enrollment.valid_from <= p_attendance_date
        and (enrollment.valid_till is null or enrollment.valid_till >= p_attendance_date)
    )
  ) then
    raise exception 'student_not_actively_enrolled' using errcode = '42501';
  end if;

  insert into public.attendance_records (
    student_id, batch_id, attendance_date, check_in_at, status, source, recorded_by
  )
  select distinct student_id, p_batch_id, p_attendance_date,
    case when p_status = 'absent' then null else now() end,
    p_status, 'bulk', auth.uid()
  from unnest(p_student_ids) requested(student_id)
  on conflict (student_id, batch_id, attendance_date) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.coach_mark_batch_attendance(uuid, uuid[], date, public.attendance_status) from public;
grant execute on function public.coach_mark_batch_attendance(uuid, uuid[], date, public.attendance_status) to authenticated;

commit;
