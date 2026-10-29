begin;

create function public.current_user_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active and status = 'active'
$$;
revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

create function public.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_user_role() in ('admin','receptionist','coach'), false)
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;
create function public.is_admin_or_receptionist() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_user_role() in ('admin','receptionist'), false)
$$;
create function public.parent_owns_student(target_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.student_parents sp join public.parents p on p.id = sp.parent_id
    where sp.student_id = target_student and p.profile_id = auth.uid()
  )
$$;
create function public.coach_has_student(target_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e
    join public.batch_coaches bc on bc.batch_id = e.batch_id
    join public.coaches c on c.id = bc.coach_id
    where e.student_id = target_student and e.status in ('active','paused') and c.profile_id = auth.uid()
  )
$$;
create function public.coach_has_batch(target_batch uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.batch_coaches bc join public.coaches c on c.id=bc.coach_id where bc.batch_id=target_batch and c.profile_id=auth.uid())
$$;
grant execute on function public.is_staff(), public.is_admin(), public.is_admin_or_receptionist(), public.parent_owns_student(uuid), public.coach_has_student(uuid), public.coach_has_batch(uuid) to authenticated;

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, email, role)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''), split_part(new.email,'@',1)), new.email, 'parent')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.parents enable row level security;
alter table public.student_parents enable row level security;
alter table public.coaches enable row level security;
alter table public.coach_specializations enable row level security;
alter table public.fee_plans enable row level security;
alter table public.batches enable row level security;
alter table public.batch_days enable row level security;
alter table public.batch_coaches enable row level security;
alter table public.enrollments enable row level security;
alter table public.enrollment_history enable row level security;
alter table public.qr_profiles enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_corrections enable row level security;
alter table public.offline_attendance_queue enable row level security;
alter table public.discounts enable row level security;
alter table public.student_discounts enable row level security;
alter table public.late_fee_rules enable row level security;
alter table public.monthly_charges enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table public.notifications enable row level security;
alter table public.student_documents enable row level security;
alter table public.student_medical_records enable row level security;
alter table public.vaccinations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.auth_audit_logs enable row level security;

create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_admin_write on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy students_read on public.students for select using (public.is_admin_or_receptionist() or public.coach_has_student(id) or public.parent_owns_student(id));
create policy students_staff_insert on public.students for insert with check (public.is_admin_or_receptionist());
create policy students_staff_update on public.students for update using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());
create policy students_admin_delete on public.students for delete using (public.is_admin());

create policy parents_read on public.parents for select using (public.is_admin_or_receptionist() or profile_id = auth.uid());
create policy parents_staff_write on public.parents for all using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());
create policy parents_self_update on public.parents for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy student_parents_read on public.student_parents for select using (public.is_admin_or_receptionist() or public.coach_has_student(student_id) or public.parent_owns_student(student_id));
create policy student_parents_staff_write on public.student_parents for all using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());

create policy coaches_read on public.coaches for select using (public.is_staff());
create policy coaches_admin_write on public.coaches for all using (public.is_admin()) with check (public.is_admin());
create policy coach_specs_read on public.coach_specializations for select using (public.is_staff());
create policy coach_specs_admin_write on public.coach_specializations for all using (public.is_admin()) with check (public.is_admin());

create policy fee_plans_read on public.fee_plans for select using (public.is_staff() or public.current_user_role() = 'parent');
create policy fee_plans_admin_write on public.fee_plans for all using (public.is_admin()) with check (public.is_admin());
create policy batches_read on public.batches for select using (public.is_staff() or public.current_user_role() = 'parent');
create policy batches_admin_write on public.batches for all using (public.is_admin()) with check (public.is_admin());
create policy batch_days_read on public.batch_days for select using (public.is_staff() or public.current_user_role() = 'parent');
create policy batch_days_admin_write on public.batch_days for all using (public.is_admin()) with check (public.is_admin());
create policy batch_coaches_read on public.batch_coaches for select using (public.is_staff());
create policy batch_coaches_admin_write on public.batch_coaches for all using (public.is_admin()) with check (public.is_admin());

create policy enrollments_read on public.enrollments for select using (public.is_admin_or_receptionist() or public.coach_has_student(student_id) or public.parent_owns_student(student_id));
create policy enrollments_staff_write on public.enrollments for all using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());
create policy enrollment_history_read on public.enrollment_history for select using (public.is_staff() or exists(select 1 from public.enrollments e where e.id=enrollment_id and public.parent_owns_student(e.student_id)));
create policy enrollment_history_staff_insert on public.enrollment_history for insert with check (public.is_admin_or_receptionist());
create policy qr_profiles_read on public.qr_profiles for select using (public.is_admin_or_receptionist() or public.parent_owns_student(student_id));
create policy qr_profiles_admin_write on public.qr_profiles for all using (public.is_admin()) with check (public.is_admin());

create policy attendance_read on public.attendance_records for select using (public.is_admin_or_receptionist() or public.coach_has_student(student_id) or public.parent_owns_student(student_id));
create policy attendance_staff_write on public.attendance_records for all using (public.is_admin_or_receptionist() or public.coach_has_student(student_id)) with check (public.is_admin_or_receptionist() or public.coach_has_student(student_id));
create policy corrections_read on public.attendance_corrections for select using (public.is_staff());
create policy corrections_staff_insert on public.attendance_corrections for insert with check (public.is_staff() and requested_by=auth.uid());
create policy corrections_admin_update on public.attendance_corrections for update using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());
create policy offline_queue_own on public.offline_attendance_queue for all using (created_by=auth.uid() or public.is_admin()) with check (created_by=auth.uid() and public.is_staff());

create policy discounts_read on public.discounts for select using (public.is_staff());
create policy discounts_admin_write on public.discounts for all using (public.is_admin()) with check (public.is_admin());
create policy student_discounts_read on public.student_discounts for select using (public.is_staff() or public.parent_owns_student(student_id));
create policy student_discounts_admin_write on public.student_discounts for all using (public.is_admin()) with check (public.is_admin());
create policy late_rules_read on public.late_fee_rules for select using (public.is_staff());
create policy late_rules_admin_write on public.late_fee_rules for all using (public.is_admin()) with check (public.is_admin());
create policy charges_read on public.monthly_charges for select using (public.is_admin_or_receptionist() or public.parent_owns_student(student_id));
create policy charges_staff_write on public.monthly_charges for all using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());
create policy payments_read on public.payments for select using (public.is_admin_or_receptionist() or public.parent_owns_student(student_id));
create policy payments_staff_insert on public.payments for insert with check (public.is_admin_or_receptionist());
create policy receipts_read on public.receipts for select using (public.is_admin_or_receptionist() or exists(select 1 from public.payments p where p.id=payment_id and public.parent_owns_student(p.student_id)));
create policy receipts_staff_insert on public.receipts for insert with check (public.is_admin_or_receptionist());

create policy notifications_read on public.notifications for select using (public.is_staff() or exists(select 1 from public.parents p where p.id=parent_id and p.profile_id=auth.uid()));
create policy notifications_staff_write on public.notifications for all using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());
create policy documents_read on public.student_documents for select using (public.is_admin_or_receptionist() or public.coach_has_student(student_id) or public.parent_owns_student(student_id));
create policy documents_staff_write on public.student_documents for all using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());
create policy medical_read on public.student_medical_records for select using (public.is_admin_or_receptionist() or public.coach_has_student(student_id) or public.parent_owns_student(student_id));
create policy medical_staff_write on public.student_medical_records for all using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());
create policy vaccinations_read on public.vaccinations for select using (public.is_staff() or exists(select 1 from public.student_medical_records m where m.id=medical_record_id and public.parent_owns_student(m.student_id)));
create policy vaccinations_staff_write on public.vaccinations for all using (public.is_admin_or_receptionist()) with check (public.is_admin_or_receptionist());
create policy audit_admin_read on public.audit_logs for select using (public.is_admin());
create policy auth_audit_admin_read on public.auth_audit_logs for select using (public.is_admin());
create policy auth_audit_self_insert on public.auth_audit_logs for insert with check (user_id = auth.uid());

create function public.create_enrollment(
  p_student_id uuid, p_batch_id uuid, p_fee_plan_id uuid, p_valid_from date,
  p_valid_till date default null, p_notes text default null
) returns public.enrollments language plpgsql security invoker as $$
declare result public.enrollments; plan_fee numeric; occupied integer; max_capacity integer;
begin
  if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  select monthly_fee into strict plan_fee from public.fee_plans where id=p_fee_plan_id and status='active';
  select capacity into strict max_capacity from public.batches where id=p_batch_id and status='active' for update;
  select count(*) into occupied from public.enrollments where batch_id=p_batch_id and status='active';
  if occupied >= max_capacity then raise exception 'batch_capacity_reached'; end if;
  insert into public.enrollments(student_id,batch_id,fee_plan_id,valid_from,valid_till,monthly_fee,notes,created_by)
  values(p_student_id,p_batch_id,p_fee_plan_id,p_valid_from,p_valid_till,plan_fee,p_notes,auth.uid()) returning * into result;
  insert into public.enrollment_history(enrollment_id,event_type,to_batch_id,new_status,effective_on,reason,changed_by)
  values(result.id,'created',p_batch_id,'active',p_valid_from,p_notes,auth.uid());
  return result;
end $$;

create function public.change_enrollment_status(p_enrollment_id uuid, p_status public.enrollment_status, p_reason text default null)
returns public.enrollments language plpgsql security invoker as $$
declare result public.enrollments; old_status public.enrollment_status;
begin
  if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  select status into strict old_status from public.enrollments where id=p_enrollment_id for update;
  if p_status not in ('active','paused','cancelled') then raise exception 'invalid_status_transition'; end if;
  update public.enrollments set status=p_status, valid_till=case when p_status='cancelled' then current_date else valid_till end where id=p_enrollment_id returning * into result;
  insert into public.enrollment_history(enrollment_id,event_type,previous_status,new_status,effective_on,reason,changed_by)
  values(p_enrollment_id,'status_changed',old_status,p_status,current_date,p_reason,auth.uid());
  return result;
end $$;

create function public.transfer_enrollment(p_enrollment_id uuid,p_batch_id uuid,p_effective_on date,p_reason text default null)
returns public.enrollments language plpgsql security invoker as $$
declare result public.enrollments; old_batch uuid; occupied integer; max_capacity integer;
begin
  if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  select batch_id into strict old_batch from public.enrollments where id=p_enrollment_id and status='active' for update;
  select capacity into strict max_capacity from public.batches where id=p_batch_id and status='active' for update;
  select count(*) into occupied from public.enrollments where batch_id=p_batch_id and status='active';
  if occupied >= max_capacity then raise exception 'batch_capacity_reached'; end if;
  update public.enrollments set batch_id=p_batch_id where id=p_enrollment_id returning * into result;
  insert into public.enrollment_history(enrollment_id,event_type,from_batch_id,to_batch_id,previous_status,new_status,effective_on,reason,changed_by)
  values(p_enrollment_id,'transferred',old_batch,p_batch_id,'active','active',p_effective_on,p_reason,auth.uid());
  return result;
end $$;

create function public.attendance_check_in(p_qr_token text,p_batch_id uuid,p_source text default 'qr',p_idempotency_key text default null)
returns public.attendance_records language plpgsql security definer set search_path = '' as $$
declare student uuid; result public.attendance_records;
begin
  if not (public.is_admin_or_receptionist() or public.coach_has_batch(p_batch_id)) then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  select student_id into strict student from public.qr_profiles where public_token=p_qr_token and active;
  if not exists(select 1 from public.enrollments where student_id=student and batch_id=p_batch_id and status='active' and valid_from<=current_date and (valid_till is null or valid_till>=current_date)) then raise exception 'student_not_enrolled'; end if;
  insert into public.attendance_records(student_id,batch_id,attendance_date,check_in_at,status,source,idempotency_key,recorded_by)
  values(student,p_batch_id,current_date,now(),'present',p_source,p_idempotency_key,auth.uid())
  on conflict(student_id,batch_id,attendance_date) do update set check_in_at=coalesce(public.attendance_records.check_in_at,excluded.check_in_at)
  returning * into result;
  return result;
end $$;

create function public.attendance_check_out(p_attendance_id uuid,p_idempotency_key text default null)
returns public.attendance_records language plpgsql security definer set search_path = '' as $$
declare result public.attendance_records; target_batch uuid;
begin
  select batch_id into strict target_batch from public.attendance_records where id=p_attendance_id;
  if not (public.is_admin_or_receptionist() or public.coach_has_batch(target_batch)) then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  update public.attendance_records set check_out_at=coalesce(check_out_at,now()),status='checked_out',idempotency_key=coalesce(idempotency_key,p_idempotency_key)
  where id=p_attendance_id returning * into result;
  if result.id is null then raise exception 'attendance_not_found'; end if;
  return result;
end $$;

create function public.correct_attendance(p_attendance_id uuid,p_values jsonb,p_reason text)
returns public.attendance_records language plpgsql security invoker as $$
declare old_row public.attendance_records; result public.attendance_records;
begin
  if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  select * into strict old_row from public.attendance_records where id=p_attendance_id for update;
  update public.attendance_records set
    check_in_at=coalesce((p_values->>'check_in_at')::timestamptz,check_in_at),
    check_out_at=coalesce((p_values->>'check_out_at')::timestamptz,check_out_at),
    status=coalesce((p_values->>'status')::public.attendance_status,status), source='correction'
  where id=p_attendance_id returning * into result;
  insert into public.attendance_corrections(attendance_id,previous_values,corrected_values,reason,requested_by,approved_by)
  values(p_attendance_id,to_jsonb(old_row),to_jsonb(result),p_reason,auth.uid(),auth.uid());
  return result;
end $$;

create function public.generate_monthly_charges(p_month date,p_due_day integer default 10)
returns integer language plpgsql security invoker as $$
declare inserted_count integer;
begin
  if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  if extract(day from p_month) <> 1 or p_due_day not between 1 and 28 then raise exception 'invalid_month_or_due_day'; end if;
  insert into public.monthly_charges(enrollment_id,student_id,charge_month,due_date,base_amount,discount_amount)
  select e.id,e.student_id,p_month,p_month+(p_due_day-1),e.monthly_fee,
    least(e.monthly_fee,coalesce(sum(case d.kind when 'fixed' then d.value else e.monthly_fee*d.value/100 end),0))
  from public.enrollments e left join public.student_discounts sd on sd.student_id=e.student_id and sd.valid_from<=p_month and (sd.valid_till is null or sd.valid_till>=p_month)
  left join public.discounts d on d.id=sd.discount_id and d.status='active'
  where e.status='active' and e.valid_from < p_month+interval '1 month' and (e.valid_till is null or e.valid_till>=p_month)
  group by e.id on conflict(enrollment_id,charge_month) do nothing;
  get diagnostics inserted_count = row_count; return inserted_count;
end $$;

create function public.record_payment(p_charge_id uuid,p_amount numeric,p_mode text,p_client_reference text,p_provider_reference text default null)
returns jsonb language plpgsql security invoker as $$
declare charge public.monthly_charges; payment public.payments; receipt public.receipts; paid numeric;
begin
  if not public.is_admin_or_receptionist() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  if p_amount<=0 then raise exception 'invalid_amount'; end if;
  select * into strict charge from public.monthly_charges where id=p_charge_id for update;
  select coalesce(sum(amount),0) into paid from public.payments where monthly_charge_id=p_charge_id and status='successful';
  if paid+p_amount>charge.final_amount then raise exception 'payment_exceeds_balance'; end if;
  insert into public.payments(student_id,monthly_charge_id,amount,payment_mode,provider_reference,client_reference,recorded_by)
  values(charge.student_id,p_charge_id,p_amount,p_mode,p_provider_reference,p_client_reference,auth.uid())
  on conflict(client_reference) do update set client_reference=excluded.client_reference returning * into payment;
  insert into public.receipts(payment_id,receipt_number,issued_by)
  values(payment.id,'RCP-'||to_char(current_date,'YYYYMM')||'-'||upper(substr(replace(payment.id::text,'-',''),1,8)),auth.uid())
  on conflict(payment_id) do update set payment_id=excluded.payment_id returning * into receipt;
  select coalesce(sum(amount),0) into paid from public.payments where monthly_charge_id=p_charge_id and status='successful';
  update public.monthly_charges set status=case when paid>=final_amount then 'paid'::public.charge_status when paid>0 then 'partial'::public.charge_status else status end where id=p_charge_id;
  return jsonb_build_object('payment',to_jsonb(payment),'receipt',to_jsonb(receipt));
end $$;

grant execute on function public.create_enrollment(uuid,uuid,uuid,date,date,text), public.change_enrollment_status(uuid,public.enrollment_status,text), public.transfer_enrollment(uuid,uuid,date,text), public.attendance_check_in(text,uuid,text,text), public.attendance_check_out(uuid,text), public.correct_attendance(uuid,jsonb,text), public.generate_monthly_charges(date,integer), public.record_payment(uuid,numeric,text,text,text) to authenticated;

create view public.monthly_charge_balances with (security_invoker=true) as
select c.*,coalesce(sum(p.amount) filter(where p.status='successful'),0) paid_amount,
  greatest(0,c.final_amount-coalesce(sum(p.amount) filter(where p.status='successful'),0)) balance_amount
from public.monthly_charges c left join public.payments p on p.monthly_charge_id=c.id group by c.id;
grant select on public.monthly_charge_balances to authenticated;

create function public.audit_row() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.audit_logs(actor_id,action,table_name,record_id,old_values,new_values,request_id)
  values(auth.uid(),tg_op,tg_table_name,coalesce(new.id,old.id)::text,case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end,coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb)->>'x-request-id');
  return coalesce(new,old);
end $$;
do $$ declare t text; begin
  foreach t in array array['students','parents','coaches','batches','enrollments','attendance_records','monthly_charges','payments','student_medical_records']
  loop execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.audit_row()',t); end loop;
end $$;

commit;
