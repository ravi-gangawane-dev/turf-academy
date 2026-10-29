-- READ ONLY. Run using a trusted administrative psql connection, not the browser.
-- Save output in ignored/encrypted backup storage: it includes account identifiers.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT current_database(), current_user, version();
SELECT schemaname, tablename, rowsecurity FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2;
SELECT format('SELECT %L AS table_name, count(*) AS exact_rows FROM %I.%I;',
 schemaname||'.'||tablename,schemaname,tablename)
FROM pg_tables WHERE schemaname IN ('public','auth','storage') ORDER BY 1
\gexec
SELECT conrelid::regclass AS child, confrelid::regclass AS parent,
 conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE contype='f' ORDER BY 1,2;
SELECT event_object_schema,event_object_table,trigger_name,action_timing,
 event_manipulation,action_statement FROM information_schema.triggers ORDER BY 1,2,3;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check
FROM pg_policies ORDER BY 1,2,3;
SELECT id,email,created_at,deleted_at FROM auth.users ORDER BY id;
SELECT id,full_name,role,status FROM public.profiles ORDER BY role,id;
SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets ORDER BY id;
SELECT bucket_id,name,owner_id,metadata FROM storage.objects ORDER BY bucket_id,name;
-- Scheduler inspection is separate: first confirm extension/schema availability.
SELECT extname,extversion FROM pg_extension ORDER BY 1;
ROLLBACK;
