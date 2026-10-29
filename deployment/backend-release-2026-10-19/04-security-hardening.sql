-- Security hardening: pin the search path of change_enrollment_status.
-- The security advisor reports a mutable search_path on this function. The definition below
-- is the local 202609040002 definition with only "set search_path = ''" added; every object
-- reference is already schema-qualified, so behaviour is unchanged.
--
-- PREREQUISITE: run 01-verify-before.sql check 7 and confirm the deployed definition matches
-- the local 202609040002 source. If the deployed body differs, regenerate this script from
-- the deployed definition (pg_get_functiondef) instead of applying the copy below.
--
-- Run inside one transaction; rolls back by default so nothing is committed by accident.

begin;

create or replace function public.change_enrollment_status(
  p_enrollment_id uuid,
  p_status public.enrollment_status,
  p_reason text default null
)
returns public.enrollments
language plpgsql
security invoker
set search_path = ''
as $$
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

-- Proof the pin took effect: the stored definition must contain the search_path clause
-- (Postgres normalizes it to "SET search_path TO ''" in pg_get_functiondef).
select 'hardened' as check,
       pg_get_functiondef(p.oid) ~* 'search_path' as search_path_pinned
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'change_enrollment_status';

rollback;
-- Change the final ROLLBACK to COMMIT only after running the enrollment status-change
-- regression (mock e2e enrollment flows and the live enrollment suite) against the change.
