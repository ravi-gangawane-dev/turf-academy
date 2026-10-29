-- Read-only target checks; run before and after the notification release.
with grants as (select role_name,
  has_table_privilege(role_name, 'public.notifications', 'INSERT') as can_insert,
  has_table_privilege(role_name, 'public.notifications', 'UPDATE') as can_update,
  has_any_column_privilege(role_name, 'public.notifications', 'UPDATE') as can_update_column,
  has_table_privilege(role_name, 'public.notifications', 'DELETE') as can_delete,
  has_function_privilege(role_name, 'public.claim_notification(uuid)', 'EXECUTE') as can_claim
from unnest(array['anon','authenticated','service_role']) as role_name)
select current_setting('server_version') as postgres_version,
  (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations) as migrations,
  (select jsonb_agg(to_jsonb(g)) from grants g) as notification_grants,
  relrowsecurity, relforcerowsecurity from pg_class
where oid = 'public.notifications'::regclass;
