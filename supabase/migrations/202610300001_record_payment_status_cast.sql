-- Restore explicit enum casts lost in the live record_payment definition.
-- Preserve authorization, locking, receipts, and idempotency behavior.
begin;
CREATE OR REPLACE FUNCTION public.record_payment(p_charge_id uuid, p_amount numeric, p_mode text, p_client_reference text, p_provider_reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare charge public.monthly_charges; payment public.payments; receipt public.receipts; paid numeric;
begin
  if not public.is_admin_or_receptionist() then raise exception using message = 'insufficient_privilege', errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) or nullif(trim(p_client_reference), '') is null then raise exception using message = 'invalid_payment', errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_client_reference, 0));
  select * into payment from public.payments where client_reference = p_client_reference;
  if found then
    if payment.monthly_charge_id is distinct from p_charge_id or payment.amount <> p_amount or payment.payment_mode <> p_mode or payment.provider_reference is distinct from p_provider_reference then raise exception using message = 'payment_reference_conflict', errcode = '42501';
    end if;
    select * into strict receipt from public.receipts where payment_id = payment.id;
    return jsonb_build_object('payment', to_jsonb(payment), 'receipt', to_jsonb(receipt));
  end if;
  select * into strict charge from public.monthly_charges where id = p_charge_id for update;
  select paid_amount into paid from public.monthly_charge_balances where id = p_charge_id;
  if paid + p_amount > charge.final_amount then raise exception using message = 'payment_exceeds_balance', errcode = '42501';
  end if;
  insert into public.payments(student_id, monthly_charge_id, amount, payment_mode, provider_reference, client_reference, recorded_by, status, paid_at) values (charge.student_id, p_charge_id, p_amount, p_mode, p_provider_reference, p_client_reference, auth.uid(), 'successful', now()) returning * into payment;
  insert into public.receipts(payment_id, receipt_number, issued_by) values (payment.id, 'RCP-' || to_char(now(), 'YYYYMM') || '-' || upper(replace(payment.id::text, '-', '')) || '-' || upper(trunc(100000 + random() * 89999)::text), auth.uid()) returning * into receipt;
  update public.monthly_charges set status = case when paid + p_amount >= final_amount then 'paid'::public.charge_status else 'partial'::public.charge_status end where id = p_charge_id;
  return jsonb_build_object('payment', to_jsonb(payment), 'receipt', to_jsonb(receipt));
end;
$function$;

commit;
