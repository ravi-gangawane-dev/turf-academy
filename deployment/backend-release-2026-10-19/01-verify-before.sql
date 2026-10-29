-- Read-only preflight for the 2026-10-19 backend release package.
-- SAFE TO RUN ANYWHERE: every statement is a SELECT. Run this against the project you
-- intend to change and read the output before applying 02/03/04.
-- Run with the Supabase CLI linked to the explicit project, e.g.:
--   npx supabase db query --linked --file deployment/backend-release-2026-10-19/01-verify-before.sql

-- 1. Sanity: this must be the academy database (the function only exists there).
select 'sanity' as check, count(*) as functions_found
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_admin_or_receptionist';

-- 2. Events dependency: must be MISSING before 02, PRESENT after 02.
select 'events_tables' as check, to_regclass('public.academy_events') as academy_events,
       exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.proname='run_academy_notification_automations') as automation_fn,
       exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.proname='queue_birthday_email_for_notification') as birthday_fn;

-- 3. Events RLS (run after 02; must be 'true' with two staff policies).
select 'events_rls' as check, c.relrowsecurity as rls_enabled,
       count(pol.polname) as policies
from pg_class c
left join pg_policy pol on pol.polrelid = c.oid
where c.relname = 'academy_events'
group by c.relrowsecurity;

-- 4. Hourly automation job (run after 02; pg_cron may be absent before 02 installs/uses it).
do $$ begin
  begin
    raise notice 'cron_job: % row(s) for the automation job',
      (select count(*) from cron.job where command like '%run_academy_notification_automations%');
  exception when undefined_table then
    raise notice 'cron_job: pg_cron schema not present yet (expected before 02)';
  end;
end $$;

-- 5. Ledger gaps: the six column-control versions must show applied=... depending on
--    remote prosrc matching. Compare each printed prosrc against the local migration file.
select 'ledger' as check, version, name
from supabase_migrations.schema_migrations
where version like '20261014000%' or version like '20261013000%'
order by version;

-- 6. Functions created by the six already-applied migrations (must all exist before 03).
select 'applied_fns' as check, p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'get_staff_list_page','get_student_columns_page','get_payment_list_page',
  'get_attendance_table_page','list_columns_match','list_column_value',
  'get_student_detail_page')
order by p.proname;

-- 7. Current definition of change_enrollment_status (must match the local 202609040002
--    definition before 04 is applied; 04 only adds "set search_path = ''").
select 'enrollment_fn' as check, p.prosecdef as is_security_definer,
       pg_get_function_identity_arguments(p.oid) as args,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'change_enrollment_status';

-- 8. Anonymous EXECUTE on guarded RPCs: spot-check the security-definer surface that the
--    advisor flagged. Each function below must have an explicit role guard in its body.
select 'anon_exec' as check, p.proname,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by p.proname;

-- Note: "leaked password protection" is an Auth dashboard setting, not SQL.
-- Enable it under Authentication > Settings after applying 02-04.
