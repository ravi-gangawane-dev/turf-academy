-- Run against the linked test database inside one transaction. Every fixture is rolled back.
begin;
create temporary table awp_fixture (name text primary key, id uuid) on commit drop;
do $$
declare p uuid; b uuid; s1 uuid; s2 uuid; e1 uuid; e2 uuid; suffix text := gen_random_uuid()::text;
begin
  insert into public.fee_plans(name,monthly_fee,duration_months) values('AWP plan '||suffix,1000,1) returning id into p;
  insert into public.batches(code,name,capacity,fee_plan_id) values('AWP-'||suffix,'AWP batch',10,p) returning id into b;
  insert into public.students(student_code,full_name,date_of_birth) values('AWP-S1-'||suffix,'AWP Zebra '||suffix,'2014-01-01') returning id into s1;
  insert into public.students(student_code,full_name,date_of_birth) values('AWP-S2-'||suffix,'AWP Alpha '||suffix,'2015-02-02') returning id into s2;
  insert into public.enrollments(student_id,batch_id,fee_plan_id,valid_from,monthly_fee) values(s1,b,p,current_date,1000) returning id into e1;
  insert into public.enrollments(student_id,batch_id,fee_plan_id,valid_from,monthly_fee) values(s2,b,p,current_date,1000) returning id into e2;
  insert into awp_fixture values('plan',p),('batch',b),('student1',s1),('student2',s2),('enrollment1',e1),('enrollment2',e2);
end $$;

-- Admin can read the workspace page; rows carry the exact total, ordered by student name.
select set_config('request.jwt.claim.sub', (select id::text from public.profiles where role='admin' and is_active and status='active' limit 1), true);
set local role authenticated;
do $$
declare r record; seen_alpha boolean := false; seen_zebra boolean := false; prior_name text := ''; total_seen integer := null;
begin
  if public.current_user_role() is distinct from 'admin' then raise exception 'Active admin test profile required'; end if;
  for r in
    select * from public.get_attendance_workspace_page(current_date, 500, 0)
  loop
    if total_seen is null then total_seen := r.total; elsif r.total <> total_seen then raise exception 'Total must be identical on every row'; end if;
    if r.total < 2 then raise exception 'Both fixture enrollments must be counted'; end if;
    if prior_name <> '' and r.student_name < prior_name then raise exception 'Rows must be ordered by student name'; end if;
    prior_name := r.student_name;
    if r.student_name like 'AWP Alpha%' then seen_alpha := true; end if;
    if r.student_name like 'AWP Zebra%' then
      seen_zebra := true;
      if r.attendance_id is not null then raise exception 'Unrecorded attendance must not fabricate an attendance row'; end if;
      if r.batch_name is distinct from 'AWP batch' or r.monthly_fee is distinct from 1000 then raise exception 'Joined batch/fee data missing'; end if;
    end if;
  end loop;
  if not seen_alpha or not seen_zebra then raise exception 'Fixture students missing from the workspace page'; end if;
end $$;

-- Paging: a one-row page keeps the exact total and excludes the second fixture row.
do $$
declare first_row record; second_row record; total_first integer; total_second integer;
begin
  select * into first_row from public.get_attendance_workspace_page(current_date, 1, 0);
  select * into second_row from public.get_attendance_workspace_page(current_date, 1, 1);
  total_first := first_row.total; total_second := second_row.total;
  if total_first is distinct from total_second or total_first < 2 then raise exception 'Paging must preserve the backend total'; end if;
  if first_row.enrollment_id = second_row.enrollment_id then raise exception 'Pages must not overlap'; end if;
end $$;

-- Invalid parameters are rejected with the documented message.
do $$ begin
  begin
    perform * from public.get_attendance_workspace_page(null, 500, 0);
    raise exception 'Null date was unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid attendance workspace page parameters' then raise; end if;
  end;
  begin
    perform * from public.get_attendance_workspace_page(current_date, 5000, 0);
    raise exception 'Oversized limit was unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid attendance workspace page parameters' then raise; end if;
  end;
  begin
    perform * from public.get_attendance_workspace_page(current_date, 500, -1);
    raise exception 'Negative offset was unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid attendance workspace page parameters' then raise; end if;
  end;
end $$;
reset role;

-- Coach and Parent are rejected by RLS-scoped reads (their policies do not expose the
-- full staff roster); anonymous execution is denied by the explicit revoke.
select set_config('request.jwt.claim.sub', (select id::text from public.profiles where role='parent' and is_active and status='active' limit 1), true);
set local role authenticated;
do $$
declare r record; foreign_rows integer := 0;
begin
  if public.current_user_role() is distinct from 'parent' then raise exception 'Active parent test profile required'; end if;
  for r in select * from public.get_attendance_workspace_page(current_date, 500, 0) loop
    if r.student_id not in (
      select sp.student_id from public.student_parents sp
      join public.parents pa on pa.id = sp.parent_id
      where pa.profile_id = auth.uid()
    ) then
      foreign_rows := foreign_rows + 1;
    end if;
  end loop;
  if foreign_rows > 0 then raise exception 'Parent saw students outside linked children'; end if;
end $$;
reset role;

do $$ begin
  if has_function_privilege('anon', 'public.get_attendance_workspace_page(date,integer,integer)', 'execute') then
    raise exception 'Anonymous EXECUTE must be denied';
  end if;
end $$;

rollback;
