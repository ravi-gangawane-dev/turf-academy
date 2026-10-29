alter table public.attendance_corrections
  add column if not exists resolution_status text not null default 'pending'
    check (resolution_status in ('pending', 'approved', 'rejected')),
  add column if not exists resolution_reason text,
  add column if not exists resolved_at timestamptz;

create unique index if not exists attendance_corrections_one_pending_idx
on public.attendance_corrections(attendance_id, requested_by)
where resolution_status = 'pending';

create index if not exists attendance_corrections_review_queue_idx
on public.attendance_corrections(resolution_status, created_at);

create or replace function public.resolve_attendance_correction(
  p_correction_id uuid,
  p_approve boolean,
  p_resolution_reason text default null
) returns public.attendance_corrections
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.attendance_corrections;
  requested_status text;
begin
  if not public.is_admin_or_receptionist() then
    raise exception 'attendance_correction_review_denied' using errcode = '42501';
  end if;

  select * into request
  from public.attendance_corrections
  where id = p_correction_id
  for update;

  if request.id is null then raise exception 'attendance_correction_not_found'; end if;
  if request.resolution_status <> 'pending' then
    raise exception 'attendance_correction_already_resolved' using errcode = '23505';
  end if;

  if p_approve then
    requested_status := request.corrected_values ->> 'status';
    if requested_status not in ('present', 'late', 'checked_out', 'absent') then
      raise exception 'invalid_attendance_status' using errcode = '22023';
    end if;

    update public.attendance_records
    set status = requested_status::public.attendance_status,
        source = 'correction',
        updated_at = now()
    where id = request.attendance_id;
    if not found then raise exception 'attendance_not_found'; end if;
  end if;

  update public.attendance_corrections
  set resolution_status = case when p_approve then 'approved' else 'rejected' end,
      resolution_reason = nullif(trim(p_resolution_reason), ''),
      approved_by = case when p_approve then auth.uid() else null end,
      resolved_at = now()
  where id = request.id
  returning * into request;
  return request;
end;
$$;

revoke all on function public.resolve_attendance_correction(uuid, boolean, text) from public;
grant execute on function public.resolve_attendance_correction(uuid, boolean, text) to authenticated;

create or replace function public.correct_attendance(
  p_attendance_id uuid,
  p_values jsonb,
  p_reason text
) returns public.attendance_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row public.attendance_records;
  result public.attendance_records;
begin
  if not public.is_admin_or_receptionist() then
    raise exception 'attendance_correction_denied' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'correction_reason_required' using errcode = '22023';
  end if;

  select * into old_row from public.attendance_records
  where id = p_attendance_id for update;
  if old_row.id is null then raise exception 'attendance_not_found'; end if;

  update public.attendance_records set
    check_in_at = coalesce((p_values ->> 'check_in_at')::timestamptz, check_in_at),
    check_out_at = coalesce((p_values ->> 'check_out_at')::timestamptz, check_out_at),
    status = coalesce((p_values ->> 'status')::public.attendance_status, status),
    source = 'correction', updated_at = now()
  where id = p_attendance_id returning * into result;

  insert into public.attendance_corrections(
    attendance_id, previous_values, corrected_values, reason, requested_by,
    approved_by, resolution_status, resolved_at
  ) values (
    p_attendance_id, to_jsonb(old_row), to_jsonb(result), trim(p_reason), auth.uid(),
    auth.uid(), 'approved', now()
  );
  return result;
end;
$$;

revoke all on function public.correct_attendance(uuid, jsonb, text) from public;
grant execute on function public.correct_attendance(uuid, jsonb, text) to authenticated;
