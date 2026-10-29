begin;

create table if not exists public.academy_settings (
  id boolean primary key default true check (id),
  academy_name text not null default 'Turf Cricket Academy',
  contact_email text,
  contact_phone text,
  address text,
  timezone text not null default 'Asia/Kolkata',
  currency_code text not null default 'INR' check (currency_code ~ '^[A-Z]{3}$'),
  attendance_grace_minutes integer not null default 10 check (attendance_grace_minutes between 0 and 180),
  fee_due_day integer not null default 10 check (fee_due_day between 1 and 28),
  notification_channels text[] not null default array['in_app']::text[],
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.academy_settings enable row level security;
create policy academy_settings_authenticated_read on public.academy_settings for select to authenticated using (true);
create policy academy_settings_admin_write on public.academy_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.academy_settings(id) values(true) on conflict(id) do nothing;

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  amount numeric(12,2) not null check(amount > 0),
  reason text not null check(length(trim(reason)) between 3 and 500),
  client_reference text not null unique,
  refunded_by uuid not null references public.profiles(id),
  refunded_at timestamptz not null default now()
);
create index if not exists payment_refunds_payment_idx on public.payment_refunds(payment_id, refunded_at desc);
alter table public.payment_refunds enable row level security;
create policy payment_refunds_admin_read on public.payment_refunds for select to authenticated using(public.is_admin());

create or replace function public.refund_payment(p_payment_id uuid,p_amount numeric,p_reason text,p_client_reference text)
returns public.payment_refunds language plpgsql security definer set search_path='' as $$
declare original public.payments; existing_total numeric; result public.payment_refunds; paid_total numeric; charge_total numeric;
begin
  if not public.is_admin() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  if p_amount<=0 or length(trim(p_reason))<3 then raise exception 'invalid_refund'; end if;
  select * into strict original from public.payments where id=p_payment_id for update;
  if original.status not in ('successful','partially_refunded') then raise exception 'payment_not_refundable'; end if;
  select coalesce(sum(amount),0) into existing_total from public.payment_refunds where payment_id=p_payment_id;
  if existing_total+p_amount>original.amount then raise exception 'refund_exceeds_payment'; end if;
  insert into public.payment_refunds(payment_id,amount,reason,client_reference,refunded_by)
  values(p_payment_id,p_amount,trim(p_reason),p_client_reference,auth.uid())
  on conflict(client_reference) do update set client_reference=excluded.client_reference returning * into result;
  select coalesce(sum(amount),0) into existing_total from public.payment_refunds where payment_id=p_payment_id;
  update public.payments set status=case when existing_total>=amount then 'refunded'::public.payment_status else 'partially_refunded'::public.payment_status end where id=p_payment_id;
  if original.monthly_charge_id is not null then
    select coalesce(sum(p.amount),0)-coalesce((select sum(r.amount) from public.payment_refunds r join public.payments rp on rp.id=r.payment_id where rp.monthly_charge_id=original.monthly_charge_id),0) into paid_total from public.payments p where p.monthly_charge_id=original.monthly_charge_id and p.status in ('successful','partially_refunded','refunded');
    select final_amount into charge_total from public.monthly_charges where id=original.monthly_charge_id;
    update public.monthly_charges set status=case when paid_total>=charge_total then 'paid'::public.charge_status when paid_total>0 then 'partial'::public.charge_status else 'pending'::public.charge_status end where id=original.monthly_charge_id;
  end if;
  insert into public.audit_logs(actor_id,action,table_name,record_id,new_values) values(auth.uid(),'REFUND','payments',p_payment_id::text,jsonb_build_object('refund_id',result.id,'amount',result.amount,'reason',result.reason));
  return result;
end $$;

grant select on public.academy_settings, public.payment_refunds to authenticated;
grant execute on function public.refund_payment(uuid,numeric,text,text) to authenticated;

commit;
