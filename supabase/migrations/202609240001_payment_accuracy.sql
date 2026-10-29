begin;

-- Let each existing payment reader see only refunds for payments they can read.
create policy payment_refunds_scoped_read on public.payment_refunds for select to authenticated
using (exists(select 1 from public.payments p where p.id=payment_id));

create or replace view public.monthly_charge_balances with (security_invoker=true) as
select c.*, coalesce(t.paid,0) paid_amount, greatest(0,c.final_amount-coalesce(t.paid,0)) balance_amount
from public.monthly_charges c left join lateral (
 select sum(p.amount-coalesce((select sum(r.amount) from public.payment_refunds r where r.payment_id=p.id),0)) paid
 from public.payments p where p.monthly_charge_id=c.id and p.status in ('successful','partially_refunded','refunded')
) t on true;

create or replace function public.record_payment(p_charge_id uuid,p_amount numeric,p_mode text,p_client_reference text,p_provider_reference text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare charge public.monthly_charges; payment public.payments; receipt public.receipts; paid numeric;
begin
 if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or nullif(trim(p_client_reference),'') is null then raise exception 'invalid_payment'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_client_reference,0));
 select * into payment from public.payments where client_reference=p_client_reference;
 if found then
   if payment.monthly_charge_id is distinct from p_charge_id or payment.amount<>p_amount or payment.payment_mode<>p_mode or payment.provider_reference is distinct from p_provider_reference then raise exception 'payment_reference_conflict'; end if;
   select * into strict receipt from public.receipts where payment_id=payment.id;
   return jsonb_build_object('payment',to_jsonb(payment),'receipt',to_jsonb(receipt));
 end if;
 select * into strict charge from public.monthly_charges where id=p_charge_id for update;
 select paid_amount into paid from public.monthly_charge_balances where id=p_charge_id;
 if paid+p_amount>charge.final_amount then raise exception 'payment_exceeds_balance'; end if;
 insert into public.payments(student_id,monthly_charge_id,amount,payment_mode,provider_reference,client_reference,recorded_by)
 values(charge.student_id,p_charge_id,p_amount,p_mode,p_provider_reference,p_client_reference,auth.uid()) returning * into payment;
 insert into public.receipts(payment_id,receipt_number,issued_by)
 values(payment.id,'RCP-'||to_char(current_date,'YYYYMM')||'-'||upper(replace(payment.id::text,'-','')),auth.uid()) returning * into receipt;
 update public.monthly_charges set status=case when paid+p_amount>=final_amount then 'paid'::public.charge_status else 'partial'::public.charge_status end where id=p_charge_id;
 return jsonb_build_object('payment',to_jsonb(payment),'receipt',to_jsonb(receipt));
end $$;

create or replace function public.refund_payment(p_payment_id uuid,p_amount numeric,p_reason text,p_client_reference text)
returns public.payment_refunds language plpgsql security definer set search_path='' as $$
declare original public.payments; result public.payment_refunds; refunded numeric; charge_id uuid;
begin
 if not public.is_admin() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or length(trim(p_reason)) not between 3 and 500 or p_reason is null or nullif(trim(p_client_reference),'') is null then raise exception 'invalid_refund'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_client_reference,1));
 select * into result from public.payment_refunds where client_reference=p_client_reference;
 if found then
   if result.payment_id<>p_payment_id or result.amount<>p_amount or result.reason<>trim(p_reason) then raise exception 'refund_reference_conflict'; end if;
   return result;
 end if;
 -- Use the same charge-before-payment lock order as collection.
 select monthly_charge_id into charge_id from public.payments where id=p_payment_id;
 perform 1 from public.monthly_charges where id=charge_id for update;
 select * into strict original from public.payments where id=p_payment_id for update;
 if original.status not in ('successful','partially_refunded') then raise exception 'payment_not_refundable'; end if;
 select coalesce(sum(amount),0) into refunded from public.payment_refunds where payment_id=p_payment_id;
 if refunded+p_amount>original.amount then raise exception 'refund_exceeds_payment'; end if;
 insert into public.payment_refunds(payment_id,amount,reason,client_reference,refunded_by)
 values(p_payment_id,p_amount,trim(p_reason),p_client_reference,auth.uid()) returning * into result;
 update public.payments set status=case when refunded+p_amount=amount then 'refunded'::public.payment_status else 'partially_refunded'::public.payment_status end where id=p_payment_id;
 update public.monthly_charges c set status=case when b.balance_amount=0 then 'paid'::public.charge_status when b.paid_amount>0 then 'partial'::public.charge_status else 'pending'::public.charge_status end
 from public.monthly_charge_balances b where c.id=charge_id and b.id=c.id;
 insert into public.audit_logs(actor_id,action,table_name,record_id,new_values) values(auth.uid(),'REFUND','payments',p_payment_id::text,to_jsonb(result));
 return result;
end $$;

-- A transaction's partial/full classification describes its charge's current settlement.
create or replace function public.get_payment_page(p_view text default 'list',p_offset integer default 0,p_limit integer default 10,p_student_ids uuid[] default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 with filtered as (
 select p.*,to_jsonb(s) student,to_jsonb(r) receipt,
 coalesce((select sum(f.amount) from public.payment_refunds f where f.payment_id=p.id),0) refunded_amount
 from public.payments p join public.students s on s.id=p.student_id left join public.receipts r on r.payment_id=p.id
 left join public.monthly_charge_balances c on c.id=p.monthly_charge_id
 where (p_student_ids is null or p.student_id=any(p_student_ids)) and
 case p_view when 'partial' then c.paid_amount>0 and c.balance_amount>0 and p.status in ('successful','partially_refunded')
 when 'full' then c.balance_amount=0 and p.status in ('successful','partially_refunded')
 when 'refunds' then p.status in ('successful','partially_refunded','refunded')
 when 'receipts' then r.id is not null else true end
 ), page as (select * from filtered order by paid_at desc,id limit least(greatest(p_limit,1),500) offset greatest(p_offset,0))
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),
 'total',(select count(*) from filtered),'metrics',jsonb_build_object(
 'total',(select coalesce(sum(amount-refunded_amount) filter(where status in ('successful','partially_refunded','refunded')),0) from filtered),
 'transactions',(select count(*) from filtered),'receipts',(select count(*) from filtered where receipt is not null),
 'refunded',(select coalesce(sum(refunded_amount),0) from filtered))) into result;
 return result;
end $$;
revoke all on function public.record_payment(uuid,numeric,text,text,text),public.refund_payment(uuid,numeric,text,text),public.get_payment_page(text,integer,integer,uuid[]) from public,anon;
grant execute on function public.record_payment(uuid,numeric,text,text,text),public.refund_payment(uuid,numeric,text,text),public.get_payment_page(text,integer,integer,uuid[]) to authenticated;
commit;
