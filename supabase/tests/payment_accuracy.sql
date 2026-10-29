begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where email='admin@turf.local' and role='admin' and is_active and status='active'),true);
do $$
declare e public.enrollments; c uuid; p uuid; first_refund uuid; ledger jsonb; paid numeric; balance numeric;
  plan_id uuid; batch_id uuid; student_id uuid; suffix text := gen_random_uuid()::text;
begin
 if public.current_user_role() is distinct from 'admin' then raise exception 'Active admin test profile required'; end if;
 -- Own fixtures only; the transaction rolls back every financial/test record.
 insert into public.fee_plans(name,monthly_fee,duration_months)
 values('Refund accuracy '||suffix,100.50,1) returning id into plan_id;
 insert into public.batches(code,name,capacity,fee_plan_id)
 values('REF-'||suffix,'Refund accuracy '||suffix,5,plan_id) returning id into batch_id;
 insert into public.students(student_code,full_name,date_of_birth)
 values('REF-'||suffix,'Refund accuracy '||suffix,'2014-04-12') returning id into student_id;
 insert into public.enrollments(student_id,batch_id,fee_plan_id,valid_from,monthly_fee)
 values(student_id,batch_id,plan_id,'1899-01-01',100.50) returning * into e;
 insert into public.monthly_charges(enrollment_id,student_id,charge_month,due_date,base_amount)
 values(e.id,e.student_id,'1899-01-01','1899-01-10',100.50) returning id into c;
 p := (public.record_payment(c,100.50,'cash','accuracy-payment')->'payment'->>'id')::uuid;
 if (public.record_payment(c,100.50,'cash','accuracy-payment')->'payment'->>'id')::uuid<>p then raise exception 'payment retry duplicated'; end if;
 first_refund := (public.refund_payment(p,25.25,'Partial refund','accuracy-refund')).id;
 if (public.refund_payment(p,25.25,'Partial refund','accuracy-refund')).id<>first_refund then raise exception 'refund retry duplicated'; end if;
 select paid_amount,balance_amount into paid,balance from public.monthly_charge_balances where id=c;
 if paid<>75.25 or balance<>25.25 then raise exception 'partial refund balance incorrect: %, %',paid,balance; end if;
 ledger := public.get_payment_page('partial',0,500,array[e.student_id]);
 if not exists(select 1 from jsonb_array_elements(ledger->'rows') r where r->>'id'=p::text) then raise exception 'partial settlement filter missing'; end if;
 if exists(select 1 from jsonb_array_elements(public.get_payment_page('full',0,500,array[e.student_id])->'rows') r where r->>'id'=p::text) then raise exception 'full settlement incorrectly includes partial'; end if;
 begin perform public.refund_payment(p,25.25,'Different refund','accuracy-refund'); raise exception 'accepted mismatched refund reference'; exception when others then if sqlerrm<>'refund_reference_conflict' then raise; end if; end;
 perform public.record_payment(c,25.25,'cash','accuracy-topup');
 select paid_amount,balance_amount into paid,balance from public.monthly_charge_balances where id=c;
 if paid<>100.50 or balance<>0 then raise exception 'top up after refund incorrect'; end if;
 if public.get_payment_page('list',0,1,array[e.student_id])->'metrics' is distinct from public.get_payment_page('list',1,1,array[e.student_id])->'metrics' then raise exception 'metrics change with page'; end if;
 perform public.refund_payment(p,75.25,'Complete refund','accuracy-final-refund');
 perform public.refund_payment(p,75.25,'Complete refund','accuracy-final-refund');
end $$;
rollback;
