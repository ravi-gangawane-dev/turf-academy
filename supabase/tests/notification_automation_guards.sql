-- Run as postgres on staging after 202610230007. All fixtures roll back.
begin;
do $$
declare
  guardian uuid;
  student uuid;
  batch uuid;
  plan_id uuid;
  attendance uuid;
  student_code_column text;
  ref text := gen_random_uuid()::text;
begin
  update public.academy_settings set notification_channels = array['in_app','email','whatsapp'], timezone='America/New_York';
  insert into public.parents(full_name,phone,whatsapp,email,communication_preferences)
    values('Automation guard parent','9876543210','9876543210','fixture@example.test','{"email":false,"whatsapp":false}')
    returning id into guardian;
  -- Support both the original core schema and later student-code rename.
  select case when exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='students' and column_name='student_code') then 'student_code' else 'admission_number' end into student_code_column;
  execute format('insert into public.students(%I,full_name,date_of_birth) values($1,$2,$3) returning id', student_code_column)
    into student using ref, 'Automation guard student', date '2014-01-01';
  insert into public.student_parents(student_id,parent_id,is_primary) values(student,guardian,true);
  perform public.queue_automated_parent_whatsapp_notice(guardian,student,'student_birthday_whatsapp',ref||':optout','{}');
  perform public.queue_automated_parent_notice(guardian,student,'student_birthday',ref||':birthday-optout','{}');
  if exists(select 1 from public.notifications where client_reference in(ref||':optout',ref||':birthday-optout:email')) then
    raise exception 'automated external messages ignored opt-out';
  end if;
  update public.parents set communication_preferences='{"email":true,"whatsapp":true}' where id=guardian;
  perform public.queue_automated_parent_whatsapp_notice(guardian,student,'student_birthday_whatsapp',ref||':allowed','{}');
  perform public.queue_automated_parent_notice(guardian,student,'student_birthday',ref||':birthday-allowed','{}');
  if (select count(*) from public.notifications where client_reference in(ref||':allowed',ref||':birthday-allowed:email')) <> 2 then
    raise exception 'eligible messages not queued';
  end if;
  perform public.queue_automated_parent_whatsapp_notice(guardian,student,'student_birthday_whatsapp',ref||':allowed','{}');
  if (select count(*) from public.notifications where client_reference=ref||':allowed') <> 1 then
    raise exception 'automated message duplicated';
  end if;
  update public.parents set status='inactive' where id=guardian;
  if exists(select 1 from public.claim_notification((select id from public.notifications where client_reference=ref||':allowed'))) then
    raise exception 'inactive recipient delivery claimed';
  end if;
  perform public.queue_automated_parent_whatsapp_notice(guardian,student,'student_birthday_whatsapp',ref||':inactive','{}');
  if exists(select 1 from public.notifications where client_reference=ref||':inactive') then raise exception 'inactive recipient queued'; end if;
  update public.parents set status='active' where id=guardian;
  update public.academy_settings set notification_channels=array['in_app'];
  perform public.queue_automated_parent_whatsapp_notice(guardian,student,'student_birthday_whatsapp',ref||':disabled','{}');
  if exists(select 1 from public.notifications where client_reference=ref||':disabled') then raise exception 'disabled channel queued'; end if;
  insert into public.fee_plans(name,monthly_fee) values('Guard plan '||ref,1000) returning id into plan_id;
  insert into public.batches(code,name,capacity,fee_plan_id) values(ref,'Guard batch',10,plan_id) returning id into batch;
  insert into public.attendance_records(student_id,batch_id,attendance_date,status)
    values(student,batch,current_date,'absent') returning id into attendance;
  update public.attendance_records set check_in_at='2026-01-01T12:00:00Z',status='present' where id=attendance;
  update public.attendance_records set check_in_at='2026-01-01T12:01:00Z' where id=attendance;
  if (select count(*) from public.notifications where student_id=student and template_key='attendance_check_in') <> 1 then
    raise exception 'update-based check-in missing or timestamp edit duplicated notice';
  end if;
  if not exists(select 1 from public.notifications where student_id=student and template_key='attendance_check_in'
    and body like '%07:00 AM%' and status='sent') then raise exception 'attendance text ignored academy timezone'; end if;
end;
$$;
rollback;
