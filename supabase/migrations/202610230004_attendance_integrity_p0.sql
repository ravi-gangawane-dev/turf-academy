begin;

-- Phase 1 attendance integrity fixes (C-01, C-02, C-03).
--
-- C-02: make attendance_check_in idempotent. The previous body selected the QR
--   profile, then rejected any same-day record before it ever considered the
--   idempotency key, so an offline replay (or a duplicate scan) of an operation
--   that HAD already committed surfaced a hard "attendance_already_recorded"
--   error and left the client outbox permanently failing. The key is now
--   honoured first: a replay with a matching key returns the committed row as a
--   success instead of raising.
-- C-03: add an optional p_student_id entry point so manual attendance works for
--   a student who has no active QR profile. Passing either p_student_id or a
--   p_qr_token resolves the student; QR behaviour is unchanged.
-- C-01: attendance_check_out previously required no open check-in and had no
--   double-check-out guard, so a record could be checked out before it was ever
--   checked in, or re-checked-out. Both are now rejected, and a replay with a
--   matching idempotency key returns the committed row as a success. Check-out
--   gets its own key column: the shared idempotency_key already holds the
--   check-in key, so a check-out key could never be stored there for replay.

alter table public.attendance_records
  add column if not exists check_out_idempotency_key text;
create unique index if not exists attendance_records_check_out_key_idx
  on public.attendance_records(check_out_idempotency_key);

drop function if exists public.attendance_check_in(text, uuid, text, text);

create or replace function public.attendance_check_in(
  p_qr_token text default null,
  p_batch_id uuid default null,
  p_source text default 'qr',
  p_idempotency_key text default null,
  p_student_id uuid default null
) returns public.attendance_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  student uuid;
  result public.attendance_records;
  business_date date; zone text; grace integer; starts_at time;
begin
  select timezone, attendance_grace_minutes into zone, grace from public.academy_settings where id;
  zone := coalesce(zone, 'Asia/Kolkata');
  business_date := (now() at time zone zone)::date;

  if p_batch_id is null then
    raise exception 'batch_required' using errcode = '22023';
  end if;

  select start_time into starts_at from public.batches where id = p_batch_id;
  if not (public.is_admin_or_receptionist() or public.coach_has_batch(p_batch_id)) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- Resolve the student: an explicit id (manual entry) wins, otherwise the QR token.
  if p_student_id is not null then
    student := p_student_id;
    if not exists (select 1 from public.students where id = student) then
      raise exception 'student_not_found' using errcode = '22023';
    end if;
  else
    select student_id into strict student
    from public.qr_profiles
    where public_token = p_qr_token and active;
  end if;

  -- C-02: honour the idempotency key first so an offline replay of an
  -- already-committed check-in returns success instead of raising a duplicate error.
  if p_idempotency_key is not null then
    select * into result
    from public.attendance_records
    where idempotency_key = p_idempotency_key;
    if found then
      return result;
    end if;
  end if;

  if not exists (
    select 1 from public.enrollments
    where student_id = student and batch_id = p_batch_id and status = 'active'
      and valid_from <= business_date and (valid_till is null or valid_till >= business_date)
  ) then
    raise exception 'student_not_enrolled' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.attendance_records
    where student_id = student and batch_id = p_batch_id and attendance_date = business_date
  ) then
    raise exception 'attendance_already_recorded' using errcode = '23505';
  end if;

  insert into public.attendance_records (
    student_id, batch_id, attendance_date, check_in_at, status, source,
    idempotency_key, recorded_by
  ) values (
    student, p_batch_id, business_date, now(),
    case when starts_at is not null and (now() at time zone zone) > business_date + starts_at + make_interval(mins => coalesce(grace, 10))
      then 'late'::public.attendance_status else 'present'::public.attendance_status end,
    p_source, p_idempotency_key, auth.uid()
  ) returning * into result;

  return result;
end;
$$;

revoke all on function public.attendance_check_in(text, uuid, text, text, uuid) from public;
grant execute on function public.attendance_check_in(text, uuid, text, text, uuid) to authenticated;

-- C-01: harden check-out. Require an open check-in, reject a second check-out,
--   and treat a replay of an already-committed check-out (matching idempotency
--   key) as a success.
create or replace function public.attendance_check_out(
  p_attendance_id uuid,
  p_idempotency_key text default null
) returns public.attendance_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.attendance_records;
  target_batch uuid;
begin
  select * into result
  from public.attendance_records
  where id = p_attendance_id
  for update;
  if result.id is null then
    raise exception 'attendance_not_found' using errcode = '22023';
  end if;
  target_batch := result.batch_id;

  if not (public.is_admin_or_receptionist() or public.coach_has_batch(target_batch)) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- Replay of an already-committed check-out with the same key returns success.
  if result.check_out_at is not null
     and p_idempotency_key is not null
     and (result.check_out_idempotency_key = p_idempotency_key
          or result.idempotency_key = p_idempotency_key) then
    return result;
  end if;

  if result.check_in_at is null then
    raise exception 'open_check_in_required' using errcode = '22023';
  end if;
  if result.check_out_at is not null then
    raise exception 'student_already_checked_out' using errcode = '23505';
  end if;

  update public.attendance_records
  set check_out_at = now(),
      status = 'checked_out',
      idempotency_key = coalesce(idempotency_key, p_idempotency_key),
      check_out_idempotency_key = coalesce(check_out_idempotency_key, p_idempotency_key),
      updated_at = now()
  where id = p_attendance_id
  returning * into result;

  return result;
end;
$$;

revoke all on function public.attendance_check_out(uuid, text) from public;
grant execute on function public.attendance_check_out(uuid, text) to authenticated;

commit;
