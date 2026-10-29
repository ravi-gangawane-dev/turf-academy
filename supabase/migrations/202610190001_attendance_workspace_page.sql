begin;

-- Attendance workspace page (Phase 4 item 1). The attendance dashboard, manual
-- check-in/out and QR pages previously downloaded every active enrollment through a
-- client-side loop of 500-row pages plus a separate full attendance read for the day.
-- This function returns one joined, bounded page (enrollment + student + batch + the
-- day's attendance) with an exact backend total, under the caller's own RLS policies
-- (security invoker). Offline capture is unaffected: check-in/out still go through the
-- attendance_check_in / attendance_check_out RPCs and the local outbox.
create or replace function public.get_attendance_workspace_page(
 p_date date, p_limit integer default 500, p_offset integer default 0
) returns table (
 enrollment_id uuid,
 student_id uuid,
 student_name text,
 student_date_of_birth date,
 student_skill_level text,
 student_status text,
 batch_id uuid,
 batch_name text,
 batch_capacity integer,
 batch_start_time time,
 batch_end_time time,
 monthly_fee numeric,
 valid_from date,
 valid_till date,
 attendance_id uuid,
 check_in_at timestamptz,
 check_out_at timestamptz,
 attendance_status text,
 total integer
) language plpgsql stable security invoker set search_path = '' as $$
begin
 if p_date is null or p_limit is null or p_limit < 1 or p_limit > 500 or p_offset is null or p_offset < 0 then
  raise exception 'Invalid attendance workspace page parameters';
 end if;
 return query
 with roster as (
  select e.id as r_enrollment_id, e.student_id as r_student_id, s.full_name as r_student_name,
         s.date_of_birth as r_dob, s.skill_level as r_skill, s.status as r_student_status,
         e.batch_id as r_batch_id, b.name as r_batch_name, b.capacity as r_capacity,
         b.start_time as r_start, b.end_time as r_end,
         e.monthly_fee as r_fee, e.valid_from as r_from, e.valid_till as r_till
  from public.enrollments e
  join public.students s on s.id = e.student_id
  join public.batches b on b.id = e.batch_id
  where e.status = 'active'
    and e.valid_from <= p_date
    and (e.valid_till is null or e.valid_till >= p_date)
 ), totals as (select count(*)::integer as t_total from roster)
 select r.r_enrollment_id, r.r_student_id, r.r_student_name, r.r_dob, r.r_skill, r.r_student_status::text,
        r.r_batch_id, r.r_batch_name, r.r_capacity, r.r_start, r.r_end,
        r.r_fee, r.r_from, r.r_till,
        a.id, a.check_in_at, a.check_out_at, a.status::text, t.t_total
 from roster r
 cross join totals t
 left join public.attendance_records a
   on a.student_id = r.r_student_id and a.batch_id = r.r_batch_id and a.attendance_date = p_date
 order by r.r_student_name, r.r_enrollment_id
 limit p_limit offset p_offset;
end $$;

grant execute on function public.get_attendance_workspace_page(date, integer, integer) to authenticated;
revoke execute on function public.get_attendance_workspace_page(date, integer, integer) from anon, public;

commit;
