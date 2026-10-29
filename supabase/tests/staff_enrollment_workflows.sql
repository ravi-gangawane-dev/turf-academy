-- Run against the linked test database. Every fixture is rolled back.
begin;
create temporary table workflow_fixture (name text primary key, id uuid) on commit drop;
grant select, insert on workflow_fixture to authenticated;
do $$
declare p uuid; b1 uuid; b2 uuid; s uuid; suffix text := gen_random_uuid()::text;
begin
  insert into public.fee_plans(name,monthly_fee,duration_months) values('Workflow plan '||suffix,1000,1) returning id into p;
  insert into public.batches(code,name,capacity,fee_plan_id) values('WF-A-'||suffix,'Workflow batch A',1,p) returning id into b1;
  insert into public.batches(code,name,capacity,fee_plan_id) values('WF-B-'||suffix,'Workflow batch B',1,p) returning id into b2;
  insert into public.students(student_code,full_name,date_of_birth) values('WF-S-'||suffix,'Workflow SQL fixture','2014-01-01') returning id into s;
  insert into workflow_fixture values('plan',p),('batch1',b1),('batch2',b2),('student',s);
end $$;

select set_config('request.jwt.claim.sub', (select id::text from public.profiles where role='receptionist' and is_active and status='active' limit 1), true);
set local role authenticated;
do $$
declare enrolled public.enrollments;
begin
  if public.current_user_role() is distinct from 'receptionist' then raise exception 'Active receptionist test profile required'; end if;
  enrolled := public.create_enrollment((select id from workflow_fixture where name='student'),(select id from workflow_fixture where name='batch1'),(select id from workflow_fixture where name='plan'),current_date,null,'SQL workflow creation');
  insert into workflow_fixture values('enrollment',enrolled.id);
  enrolled := public.transfer_enrollment(enrolled.id,(select id from workflow_fixture where name='batch2'),current_date,'SQL workflow transfer');
  if enrolled.batch_id <> (select id from workflow_fixture where name='batch2') then raise exception 'Transfer did not persist'; end if;
  if (select count(*) from public.enrollment_history where enrollment_id=enrolled.id and changed_by=auth.uid()) <> 2 then raise exception 'History or actor did not persist'; end if;
  update public.batches set capacity=100 where id=enrolled.batch_id;
  if found then raise exception 'Direct batch updates were unexpectedly granted'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', (select id::text from public.profiles where role='coach' and is_active and status='active' limit 1), true);
set local role authenticated;
do $$
begin
  if public.current_user_role() is distinct from 'coach' then raise exception 'Active coach test profile required'; end if;
  begin
    perform public.create_enrollment((select id from workflow_fixture where name='student'),(select id from workflow_fixture where name='batch1'),(select id from workflow_fixture where name='plan'),current_date);
    raise exception 'Coach unexpectedly created an enrollment';
  exception when insufficient_privilege then null; end;
  begin
    perform public.transfer_enrollment((select id from workflow_fixture where name='enrollment'),(select id from workflow_fixture where name='batch1'),current_date);
    raise exception 'Coach unexpectedly transferred an enrollment';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claim.sub', (select id::text from public.profiles where role='parent' and is_active and status='active' limit 1), true);
set local role authenticated;
do $$
begin
  if public.current_user_role() is distinct from 'parent' then raise exception 'Active parent test profile required'; end if;
  begin
    perform public.create_enrollment((select id from workflow_fixture where name='student'),(select id from workflow_fixture where name='batch1'),(select id from workflow_fixture where name='plan'),current_date);
    raise exception 'Parent unexpectedly created an enrollment';
  exception when insufficient_privilege then null; end;
  begin
    perform public.transfer_enrollment((select id from workflow_fixture where name='enrollment'),(select id from workflow_fixture where name='batch1'),current_date);
    raise exception 'Parent unexpectedly transferred an enrollment';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
