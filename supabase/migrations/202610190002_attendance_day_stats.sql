begin;

-- Calendar day statistics (Phase 4 item 2). The attendance calendar previously downloaded
-- every attendance row in the month through readAllPages (500-row pages) and grouped the
-- statuses in the browser. This returns server-grouped per-day counts for exactly the four
-- statuses the calendar renders, under the caller's own RLS (security invoker). The paged
-- list view and exports still read rows; only month/week summaries use this function.
create or replace function public.get_attendance_day_stats(
 p_from date,
 p_to date,
 p_batch_id uuid default null,
 p_student_id uuid default null,
 p_status text default null
) returns table (
 day date,
 present integer,
 absent integer,
 late integer,
 checked_out integer,
 total integer
) language plpgsql stable security invoker set search_path = '' as $$
begin
 if p_from is null or p_to is null or p_from > p_to then
  raise exception 'Invalid attendance stats date range';
 end if;
 return query
 select r.attendance_date,
        (count(*) filter (where r.status = 'present'))::int,
        (count(*) filter (where r.status = 'absent'))::int,
        (count(*) filter (where r.status = 'late'))::int,
        (count(*) filter (where r.status = 'checked_out'))::int,
        (count(*) filter (where r.status in ('present','absent','late','checked_out')))::int
 from public.attendance_records r
 where r.attendance_date >= p_from
   and r.attendance_date <= p_to
   and (p_batch_id is null or r.batch_id = p_batch_id)
   and (p_student_id is null or r.student_id = p_student_id)
   and (p_status is null or p_status = 'all' or r.status::text = p_status)
 group by r.attendance_date
 order by r.attendance_date;
end $$;

grant execute on function public.get_attendance_day_stats(date, date, uuid, uuid, text) to authenticated;
revoke execute on function public.get_attendance_day_stats(date, date, uuid, uuid, text) from anon, public;

commit;
