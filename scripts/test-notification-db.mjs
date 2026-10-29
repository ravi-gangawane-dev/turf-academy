// Disposable PostgreSQL engine, never a remote database. See docs/notification-db-tests.md.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const root = new URL('../', import.meta.url);
const sql = async path => readFile(new URL(path, root), 'utf8');
const db = await PGlite.create({ extensions: { pgcrypto } });
let restored;
async function apply(name, transform = value => value) {
  try { await db.exec(transform(await sql(`supabase/migrations/${name}.sql`))); }
  catch (error) { throw new Error(`${name}: ${error.message}`, { cause: error }); }
}
try {
  console.log('Local database:', (await db.query('select version()')).rows[0].version);
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema extensions;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public, extensions to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    create publication supabase_realtime;
  `);
  await apply('202609040001_core_schema');
  await apply('202609040002_security_and_workflows');
  await apply('202609050011_parent_notifications_realtime');
  // Only storage policies are outside this notification test environment.
  await apply('202609050013_parent_training_sessions', value => value.split('create policy parent_linked_coach_photo_read')[0]);
  await apply('202609050015_coach_portal_security');
  await apply('202609070002_coach_notifications_p2');
  await apply('202609160002_admin_finance_settings');
  await apply('202609160003_notification_templates_and_coach_reports');
  await apply('202609200001_preserve_notifications_on_parent_delete');
  await apply('202609240005_notification_delivery');
  // Cron scheduling is not executed. Queue functions and trigger definitions are unchanged.
  await apply('202610130002_academy_notification_automations', value => value.split('create extension if not exists pg_cron')[0] + '\ncommit;');
  await apply('202610130005_birthday_email_templates');
  await db.exec(`
    insert into auth.users(id,email) values
      ('00000000-0000-0000-0000-000000000001','admin@fixture.test'),
      ('00000000-0000-0000-0000-000000000002','reception@fixture.test'),
      ('00000000-0000-0000-0000-000000000003','parent@fixture.test'),
      ('00000000-0000-0000-0000-000000000004','coach@fixture.test');
    update public.profiles set role='admin' where email='admin@fixture.test';
    update public.profiles set role='receptionist' where email='reception@fixture.test';
    update public.profiles set role='coach' where email='coach@fixture.test';
    insert into public.notifications(channel,recipient,body,status,provider_message_id)
      values ('email','history@fixture.test','Preserve existing evidence','sent','existing-provider-id');
  `);
  const before = (await db.query('select * from public.notifications order by id')).rows;
  // Rehearse restoring a pre-migration local snapshot, including roles and grants.
  const backup = await db.dumpDataDir();
  for (const name of ['202610220002_notification_integrity', '202610230001_notification_events',
    '202610230002_notification_automation_guards', '202610230003_notification_manual_whatsapp',
    '202610230007_notification_access_integrity', '202610230008_notification_filter_context']) await apply(name);
  const after = (await db.query('select * from public.notifications order by id')).rows;
  assert.equal(after.length, before.length);
  for (let i = 0; i < before.length; ++i) for (const key of Object.keys(before[i])) {
    assert.deepEqual(after[i][key], before[i][key], `Migration changed existing ${key}`);
  }
  console.log('PASS migration preserves existing notification rows and evidence');
  for (const name of ['notification_integrity', 'notification_events', 'notification_manual_whatsapp',
    'notification_role_isolation', 'notification_automation_guards', 'notification_filter_context']) {
    try { await db.exec(await sql(`supabase/tests/${name}.sql`)); }
    catch (error) { throw new Error(`${name}: ${error.message}`, { cause: error }); }
    console.log(`PASS ${name}`);
  }
  restored = await PGlite.create({ extensions: { pgcrypto }, loadDataDir: backup });
  assert.deepEqual((await restored.query('select * from public.notifications order by id')).rows, before);
  assert.equal((await restored.query(`select has_table_privilege('authenticated', 'public.notifications', 'UPDATE') allowed`)).rows[0].allowed, true);
  console.log('PASS pre-migration snapshot restores data and prior grants (local engine only)');
  console.log('LIMIT: simulated auth, selected real migrations, no PostgREST/Edge/cron or concurrent sessions. No production access.');
} catch (error) {
  console.error(error.message);
  if (error.cause?.where) console.error(error.cause.where);
  process.exitCode = 1;
} finally { await restored?.close(); await db.close(); }
