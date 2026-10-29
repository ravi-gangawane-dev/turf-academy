begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where email='admin@turf.local' and role='admin' and is_active and status='active'),true);
do $$
declare
  sid uuid; unrelated uuid; plan uuid; batch uuid; enrollment uuid; charge uuid;
  payment uuid; refund uuid; snapshot jsonb; amount numeric;
  admin_id text := auth.uid()::text;
  suffix text := gen_random_uuid()::text;
begin
  if not public.is_admin() then raise exception 'Admin fixture required'; end if;
  insert into public.fee_plans(name,monthly_fee,duration_months) values('Delete regression '||suffix,100,1) returning id into plan;
  insert into public.batches(code,name,capacity,fee_plan_id) values('DEL-'||suffix,'Delete regression',10,plan) returning id into batch;
  insert into public.students(student_code,full_name,date_of_birth) values('KEEP-'||suffix,'Unrelated deletion guard','2014-04-12') returning id into unrelated;
  foreach amount in array array[0,25,100]::numeric[] loop
    insert into public.students(student_code,full_name,date_of_birth) values('DEL-'||amount||suffix,'Delete refund regression','2014-04-12') returning id into sid;
    insert into public.enrollments(student_id,batch_id,fee_plan_id,valid_from,monthly_fee) values(sid,batch,plan,'1899-01-01',100) returning id into enrollment;
    insert into public.monthly_charges(student_id,enrollment_id,charge_month,due_date,base_amount) values(sid,enrollment,'1899-01-01','1899-01-10',100) returning id into charge;
    payment := (public.record_payment(charge,100,'cash','delete-payment-'||sid)->'payment'->>'id')::uuid;
    refund := null;
    if amount>0 then
      refund := (public.refund_payment(payment,amount,'Deletion regression refund','delete-refund-'||sid)).id;
      select to_jsonb(r) into snapshot from public.payment_refunds r where id=refund;
    end if;
    perform set_config('request.jwt.claim.sub',(select id::text from public.profiles where email='receptionist@turf.local'),true);
    begin
      perform public.delete_student_profile(sid);
      raise exception 'Non-admin deletion unexpectedly allowed';
    exception when insufficient_privilege then null;
    end;
    perform set_config('request.jwt.claim.sub',admin_id,true);
    if not exists(select 1 from public.payments where id=payment) then raise exception 'Denied deletion changed payment'; end if;
    perform public.delete_student_profile(sid);
    if exists(select 1 from public.students where id=sid)
      or exists(select 1 from public.payments where id=payment)
      or exists(select 1 from public.payment_refunds where payment_id=payment)
      or exists(select 1 from public.monthly_charges where id=charge)
      or exists(select 1 from public.enrollments where id=enrollment)
      or exists(select 1 from public.receipts where payment_id=payment)
      then raise exception 'Student dependencies remain'; end if;
    if amount>0 and (select count(*) from public.audit_logs where table_name='payment_refunds' and record_id=refund::text and action='DELETE' and old_values=snapshot and actor_id=admin_id::uuid)<>1 then
      raise exception 'Exact refund audit snapshot missing';
    end if;
    if not exists(select 1 from public.students where id=unrelated) then raise exception 'Unrelated student affected'; end if;
    begin
      perform public.delete_student_profile(sid);
      raise exception 'Missing student unexpectedly accepted';
    exception when no_data_found then null;
    end;
  end loop;
end $$;
rollback;
