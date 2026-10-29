begin;
do $$
declare
  actor uuid; student uuid; guardian uuid; plan_id uuid; original_batch uuid; moved_batch uuid;
  attendance uuid; notice uuid; enrollment uuid; charge uuid; ref text := gen_random_uuid()::text; code_column text;
begin
  select id into strict actor from public.profiles where role='admin' and is_active and status='active' limit 1;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  select case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='students'
    and column_name='student_code') then 'student_code' else 'admission_number' end into code_column;
  execute format('insert into public.students(%I, full_name, date_of_birth) values($1,$2,$3) returning id',code_column)
    into student using ref,'Filter student',date '2014-01-01';
  insert into public.parents(full_name,phone) values('Filter parent','9876543210') returning id into guardian;
  insert into public.student_parents(student_id,parent_id) values(student,guardian);
  insert into public.fee_plans(name,monthly_fee) values(ref,1000) returning id into plan_id;
  insert into public.batches(code,name,capacity,fee_plan_id) values(ref,'Original batch',10,plan_id) returning id into original_batch;
  insert into public.batches(code,name,capacity,fee_plan_id) values(ref||'-moved','Moved batch',10,plan_id) returning id into moved_batch;
  insert into public.attendance_records(student_id,batch_id,check_in_at)
    values(student,original_batch,now()) returning id into attendance;
  select id into strict notice from public.notifications where student_id=student and template_key='attendance_check_in';
  if not exists(select 1 from public.notifications where id=notice and source_batch_id=original_batch and source_batch_name='Original batch') then
    raise exception 'attendance source batch missing';
  end if;
  update public.attendance_records set batch_id=moved_batch where id=attendance;
  update public.batches set name='Renamed batch' where id=original_batch;
  if not exists(select 1 from public.notifications where id=notice and source_batch_id=original_batch and source_batch_name='Original batch') then
    raise exception 'history followed mutable source';
  end if;
  insert into public.enrollments(student_id,batch_id,fee_plan_id,valid_from,monthly_fee)
    values(student,original_batch,plan_id,current_date,1000) returning id into enrollment;
  insert into public.monthly_charges(enrollment_id,student_id,charge_month,due_date,base_amount)
    values(enrollment,student,date_trunc('month',current_date)::date,current_date,1000) returning id into charge;
  perform public.queue_automated_parent_notice(guardian,student,'fee_due_today','automation:fee_due_today:'||charge::text||':'||current_date::text||':'||guardian::text,'{}');
  if not exists(select 1 from public.notifications where student_id=student and template_key='fee_due_today' and source_batch_id=original_batch) then
    raise exception 'fee generation did not capture its batch';
  end if;
  update public.enrollments set batch_id=moved_batch where id=enrollment;
  if not exists(select 1 from public.notifications where student_id=student and template_key='fee_due_today' and source_batch_id=original_batch) then
    raise exception 'fee history followed changed enrollment';
  end if;
  perform public.queue_automated_parent_notice(guardian,student,'attendance_missed_three_days',
    'automation:attendance_missed_three_days:'||student::text||':'||moved_batch::text||':never','{}');
  if not exists(select 1 from public.notifications where student_id=student and template_key='attendance_missed_three_days' and source_batch_id=moved_batch) then
    raise exception 'absence source batch missing';
  end if;
  insert into public.notifications(student_id,parent_id,channel,recipient,body,client_reference)
    values(student,guardian,'in_app','fixture','Unrelated notice',ref);
  if exists(select 1 from public.notifications where client_reference=ref and source_batch_id is not null) then
    raise exception 'batch inferred from current enrollment';
  end if;
  delete from public.batches where id=original_batch;
  execute 'set local role authenticated';
  if not exists(select 1 from public.notification_filter_options('batch','',original_batch::text)
    where value=original_batch::text and label like '%Historical') then
    raise exception 'removed historical batch not selectable';
  end if;
  if not exists(select 1 from public.notification_filter_options('student','no-match',student::text) where value=student::text) then
    raise exception 'selected entity omitted from choices';
  end if;
  if not exists(select 1 from public.notification_filter_options('recipient','Filter parent','') where value='parent:'||guardian::text) then
    raise exception 'recipient identity missing';
  end if;
  if exists(select 1 from public.notification_filter_options('student','%','')) then
    raise exception 'search treated percent as wildcard';
  end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin
    perform public.notification_filter_options('student','','');
    raise exception 'nonstaff enumerated filter entities';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end;
$$;
rollback;
