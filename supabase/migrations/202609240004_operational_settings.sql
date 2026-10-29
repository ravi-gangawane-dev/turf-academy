begin;
create function public.validate_academy_settings() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'invalid_timezone'; end if;
 if not new.notification_channels <@ array['in_app','email','sms','whatsapp']::text[] then raise exception 'invalid_notification_channel'; end if;
 new.updated_by:=auth.uid();new.updated_at:=now();return new;
end $$;
create trigger validate_academy_settings before update on public.academy_settings for each row execute function public.validate_academy_settings();

create or replace function public.generate_monthly_charges(p_month date,p_due_day integer default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare inserted_count integer;
begin
 if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 p_due_day:=coalesce(p_due_day,(select fee_due_day from public.academy_settings where id),10);
 if p_month is null or extract(day from p_month)<>1 or p_due_day not between 1 and 28 then raise exception 'invalid_month_or_due_day'; end if;
 insert into public.monthly_charges(enrollment_id,student_id,charge_month,due_date,base_amount,discount_amount)
 select e.id,e.student_id,p_month,p_month+(p_due_day-1),e.monthly_fee,
 least(e.monthly_fee,coalesce(sum(case d.kind when 'fixed' then d.value else e.monthly_fee*d.value/100 end),0))
 from public.enrollments e left join public.student_discounts sd on sd.student_id=e.student_id and sd.valid_from<=p_month and (sd.valid_till is null or sd.valid_till>=p_month)
 left join public.discounts d on d.id=sd.discount_id and d.status='active'
 where e.status='active' and e.valid_from<p_month+interval '1 month' and (e.valid_till is null or e.valid_till>=p_month)
 group by e.id on conflict(enrollment_id,charge_month) do nothing;
 get diagnostics inserted_count=row_count;return inserted_count;
end $$;

create function public.get_dashboard_analytics() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; zone text; today date;
begin
 if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
 select timezone into zone from public.academy_settings where id;zone:=coalesce(zone,'Asia/Kolkata');today:=(now() at time zone zone)::date;
 select jsonb_build_object(
 'attendance',(select jsonb_agg(jsonb_build_object('day',d.day::date,'count',(select count(*) from public.attendance_records a where a.attendance_date=d.day::date and a.status in ('present','late','checked_out'))) order by d.day) from generate_series(today-6,today,interval '1 day') d(day)),
 'collections',(select jsonb_agg(jsonb_build_object('month',to_char(m.month,'YYYY-MM'),'amount',coalesce((select sum(p.amount-coalesce((select sum(r.amount) from public.payment_refunds r where r.payment_id=p.id),0)) from public.payments p where p.status in ('successful','partially_refunded','refunded') and (p.paid_at at time zone zone)>=m.month and (p.paid_at at time zone zone)<m.month+interval '1 month'),0)) order by m.month) from generate_series(date_trunc('month',today)-interval '5 months',date_trunc('month',today),interval '1 month') m(month)),
 'pendingFees',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'studentName',f.full_name,'batchName',f.name,'amountPaise',round(f.balance_amount*100),'dueLabel',f.due_date::text,'overdue',f.due_date<today)) from (select c.id,s.full_name,b.name,c.balance_amount,c.due_date from public.monthly_charge_balances c join public.students s on s.id=c.student_id join public.enrollments e on e.id=c.enrollment_id join public.batches b on b.id=e.batch_id where c.balance_amount>0 and c.status<>'waived' order by c.due_date,c.id limit 5) f),'[]'::jsonb)
 ) into result;return result;
end $$;
revoke all on function public.get_dashboard_analytics() from public,anon;
grant execute on function public.get_dashboard_analytics() to authenticated;
create or replace function public.attendance_check_in(
  p_qr_token text,
  p_batch_id uuid,
  p_source text default 'qr',
  p_idempotency_key text default null
) returns public.attendance_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  student uuid;
  result public.attendance_records;
  business_date date; zone text; grace integer; starts_at time;
begin
  select timezone,attendance_grace_minutes into zone,grace from public.academy_settings where id;
  zone:=coalesce(zone,'Asia/Kolkata');business_date:=(now() at time zone zone)::date;
  select start_time into starts_at from public.batches where id=p_batch_id;
  if not (public.is_admin_or_receptionist() or public.coach_has_batch(p_batch_id)) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select student_id into strict student
  from public.qr_profiles
  where public_token = p_qr_token and active;

  if not exists (
    select 1 from public.enrollments
    where student_id = student and batch_id = p_batch_id and status = 'active'
      and valid_from <= business_date and (valid_till is null or valid_till >= business_date)
  ) then
    raise exception 'student_not_enrolled' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.attendance_records
    where student_id = student and batch_id = p_batch_id and attendance_date = business_date
  ) then
    raise exception 'attendance_already_recorded';
  end if;

  insert into public.attendance_records (
    student_id, batch_id, attendance_date, check_in_at, status, source,
    idempotency_key, recorded_by
  ) values (
    student, p_batch_id, business_date, now(), case when starts_at is not null and (now() at time zone zone)>business_date+starts_at+make_interval(mins=>coalesce(grace,10)) then 'late'::public.attendance_status else 'present'::public.attendance_status end, p_source,
    p_idempotency_key, auth.uid()
  ) returning * into result;

  return result;
end;
$$;


commit;
