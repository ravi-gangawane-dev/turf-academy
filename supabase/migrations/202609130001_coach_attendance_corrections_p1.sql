begin;

drop policy if exists corrections_read on public.attendance_corrections;
drop policy if exists corrections_scoped_read on public.attendance_corrections;
create policy corrections_scoped_read
on public.attendance_corrections
for select
using (public.is_admin_or_receptionist() or requested_by = auth.uid());

drop policy if exists corrections_staff_insert on public.attendance_corrections;
create policy corrections_admin_insert
on public.attendance_corrections
for insert
with check (public.is_admin_or_receptionist() and requested_by = auth.uid());

create or replace function public.coach_request_attendance_correction(
  p_attendance_id uuid,
  p_values jsonb,
  p_reason text
) returns public.attendance_corrections
language plpgsql
security definer
set search_path = ''
as $$
declare
  attendance public.attendance_records;
  result public.attendance_corrections;
  requested_status text := p_values ->> 'status';
begin
  if public.current_user_role() <> 'coach' then
    raise exception 'coach_access_required' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'correction_reason_required' using errcode = '22023';
  end if;
  if requested_status not in ('present', 'absent', 'late', 'checked_out') then
    raise exception 'invalid_attendance_status' using errcode = '22023';
  end if;

  select * into attendance
  from public.attendance_records
  where id = p_attendance_id;
  if attendance.id is null then raise exception 'attendance_not_found'; end if;
  if not public.coach_has_batch(attendance.batch_id) then
    raise exception 'coach_attendance_access_denied' using errcode = '42501';
  end if;

  insert into public.attendance_corrections (
    attendance_id, previous_values, corrected_values, reason, requested_by
  ) values (
    attendance.id, to_jsonb(attendance), jsonb_build_object('status', requested_status),
    btrim(p_reason), auth.uid()
  ) returning * into result;
  return result;
end;
$$;

revoke all on function public.coach_request_attendance_correction(uuid, jsonb, text) from public;
grant execute on function public.coach_request_attendance_correction(uuid, jsonb, text) to authenticated;

create index if not exists attendance_corrections_requested_created_idx
on public.attendance_corrections(requested_by, created_at desc);

commit;
