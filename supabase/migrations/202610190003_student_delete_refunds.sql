-- Permanent student deletion retains refund snapshots in the audit log.
create or replace function public.delete_student_profile(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_parent_ids uuid[];
begin
  if not public.is_admin() then raise exception 'insufficient_privilege' using errcode='42501'; end if;
  perform 1 from public.students where id=p_student_id for update;
  if not found then raise exception 'student_not_found' using errcode='P0002'; end if;
  -- Match payment/refund lock order: charge before payment.
  perform 1 from public.monthly_charges where student_id=p_student_id order by id for update;
  perform 1 from public.payments where student_id=p_student_id order by id for update;
  select array_agg(parent_id) into v_parent_ids from public.student_parents where student_id=p_student_id;
  delete from public.attendance_corrections where attendance_id in (select id from public.attendance_records where student_id=p_student_id);
  delete from public.attendance_records where student_id=p_student_id;
  delete from public.receipts where payment_id in (select id from public.payments where student_id=p_student_id);
  -- Keep an admin-visible snapshot before permanent removal from the ledger.
  with removed as (
    delete from public.payment_refunds
    where payment_id in (select id from public.payments where student_id=p_student_id)
    returning *
  )
  insert into public.audit_logs(actor_id,action,table_name,record_id,old_values)
  select auth.uid(),'DELETE','payment_refunds',r.id::text,to_jsonb(r) from removed r;
  delete from public.payments where student_id=p_student_id;
  delete from public.monthly_charges where student_id=p_student_id;
  delete from public.enrollment_history where enrollment_id in (select id from public.enrollments where student_id=p_student_id);
  delete from public.enrollments where student_id=p_student_id;
  delete from public.student_discounts where student_id=p_student_id;
  update public.notifications set student_id=null where student_id=p_student_id;
  delete from public.students where id=p_student_id;
  delete from public.parents p where p.id=any(coalesce(v_parent_ids,array[]::uuid[]))
    and not exists(select 1 from public.student_parents sp where sp.parent_id=p.id) and p.profile_id is null;
end;
$$;

revoke all on function public.delete_student_profile(uuid) from public, anon;
grant execute on function public.delete_student_profile(uuid) to authenticated;
