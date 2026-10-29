begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='receptionist' and is_active limit 1),true);
do $$
declare b uuid; c uuid; s uuid; fp uuid; eid uuid; payload jsonb;
begin
 select id into strict fp from public.fee_plans where status='active' limit 1;
 select id into strict c from public.coaches where status='active' limit 1;
 insert into public.students(student_code,full_name,date_of_birth) values('BATCH-WORKFLOW-TEST','Batch workflow test','2014-01-01') returning id into s;
 payload:=jsonb_build_object('code','BATCH-WORKFLOW-TEST','name','Batch workflow test','capacity',2,'waitlist_capacity',1,'start_date',current_date,'start_time','06:00','end_time','08:00','fee_plan_id',fp);
 b:=public.save_batch_workspace(payload,array[1,3,5],jsonb_build_array(jsonb_build_object('coach_id',c,'is_primary',true)));
 if (select count(*) from public.batch_days where batch_id=b)<>3 then raise exception 'days not saved'; end if;
 perform public.set_batch_coach(b,c,'assistant');
 if (select is_primary from public.batch_coaches where batch_id=b and coach_id=c) then raise exception 'coach role not saved'; end if;
 perform public.manage_batch_waitlist(b,s,'add');
 perform public.manage_batch_waitlist(b,s,'add');
 if (select count(*) from public.batch_waitlist where batch_id=b and status='waiting')<>1 then raise exception 'duplicate waiting student'; end if;
 eid:=public.manage_batch_waitlist(b,s,'promote');
 if (select status from public.enrollments where id=eid)<>'active' then raise exception 'promotion not enrolled'; end if;
 if exists(select 1 from public.batch_waitlist where batch_id=b and status='waiting') then raise exception 'promoted student still waiting'; end if;
 begin
  perform public.save_batch_workspace(payload||jsonb_build_object('id',b,'name','Must roll back'),array[9],'[]'::jsonb);
  raise exception 'invalid day accepted';
 exception when check_violation then null;
 end;
 if (select name from public.batches where id=b)<>'Batch workflow test' then raise exception 'failed save partially persisted'; end if;
 perform set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='coach' and is_active limit 1),true);
 begin perform public.set_batch_coach(b,c,'remove');raise exception 'coach bypassed staff check';exception when insufficient_privilege then null;end;
end $$;
rollback;
