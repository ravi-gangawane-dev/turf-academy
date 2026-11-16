// Disposable PostgreSQL engine, never a remote database.
// Verifies the P0 profile access guard, its audit trail and the profile/audit
// RLS policies against the real migration SQL.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const root = new URL('../', import.meta.url);
const sql = async (path) => readFile(new URL(path, root), 'utf8');
const db = await PGlite.create({ extensions: { pgcrypto } });

async function apply(name) {
  try {
    await db.exec(await sql(`supabase/migrations/${name}.sql`));
  } catch (error) {
    throw new Error(`${name}: ${error.message}`, { cause: error });
  }
}

async function asUser(userId, work) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false);`);
  await db.exec('set role authenticated;');
  try {
    return await work();
  } finally {
    await db.exec('reset role;');
    await db.exec(`select set_config('request.jwt.claim.sub', '', false);`);
  }
}

async function expectFailure(work, pattern) {
  let failed = false;
  try {
    await work();
  } catch (error) {
    failed = true;
    assert.match(error.message, pattern);
  }
  assert.equal(failed, true, `Expected failure matching ${pattern}`);
}

const ids = {
  admin1: '00000000-0000-0000-0000-000000000001',
  admin2: '00000000-0000-0000-0000-000000000002',
  reception: '00000000-0000-0000-0000-000000000003',
  parent: '00000000-0000-0000-0000-000000000004',
};

try {
  console.log('Local database:', (await db.query('select version()')).rows[0].version);
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema extensions;
    create table auth.users(
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb default '{}',
      email_confirmed_at timestamptz
    );
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
  await apply('202610310001_invitation_lifecycle');
  await apply('202611040001_user_access_guard');
  await apply('202611040002_role_catalog');
  await apply('202611160001_profile_delete_guard');
  await apply('202611160002_profile_permissions');

  await db.exec(`
    insert into auth.users(id, email, raw_user_meta_data) values
      ('${ids.admin1}', 'admin1@fixture.test', '{"full_name":"Admin One"}'),
      ('${ids.admin2}', 'admin2@fixture.test', '{"full_name":"Admin Two"}'),
      ('${ids.reception}', 'reception@fixture.test', '{"full_name":"Reception User"}'),
      ('${ids.parent}', 'parent@fixture.test', '{"full_name":"Parent User"}');
    update public.profiles set role = 'admin' where id in ('${ids.admin1}', '${ids.admin2}');
    update public.profiles set role = 'receptionist' where id = '${ids.reception}';
    update public.profiles set role = 'parent' where id = '${ids.parent}';
  `);

  // 1. An administrator cannot demote or deactivate themselves.
  await asUser(ids.admin1, async () => {
    await expectFailure(
      () => db.exec(`update public.profiles set status = 'inactive' where id = '${ids.admin1}';`),
      /own active administrator/,
    );
    assert.equal(
      (await db.query(`select role, status from public.profiles where id = '${ids.admin1}'`)).rows[0].status,
      'active',
    );
  });
  console.log('PASS direct self-demotion is blocked');

  // 2. A non-self demotion is allowed while another active admin remains and is audited.
  await asUser(ids.admin1, async () => {
    await db.exec(`update public.profiles set role = 'coach' where id = '${ids.admin2}';`);
  });
  assert.deepEqual(
    (await db.query(`select role from public.profiles where id = '${ids.admin2}'`)).rows[0],
    { role: 'coach' },
  );
  const audit = (
    await db.query(
      `select actor_id, action, table_name, record_id, old_values, new_values
         from public.audit_logs
        where table_name = 'profiles' and action = 'user_access_updated'
        order by id desc limit 1`,
    )
  ).rows[0];
  assert.equal(audit.actor_id, ids.admin1);
  assert.equal(audit.record_id, ids.admin2);
  assert.equal(audit.old_values.role, 'admin');
  assert.equal(audit.new_values.role, 'coach');
  console.log('PASS non-self demotion succeeds and records actor + before/after values');

  // 3. The last active administrator cannot be removed, even by a direct write
  //    with no authenticated caller (the service-role/Edge path).
  await expectFailure(
    () => db.exec(`update public.profiles set status = 'inactive' where id = '${ids.admin1}';`),
    /At least one active administrator must remain/,
  );
  assert.equal(
    (await db.query(`select status from public.profiles where id = '${ids.admin1}'`)).rows[0].status,
    'active',
  );
  console.log('PASS last-active-administrator protection applies to direct/service-role writes');

  // 4. Promotion and non-self demotion of a second admin remain possible.
  await asUser(ids.admin1, async () => {
    await db.exec(`update public.profiles set role = 'admin' where id = '${ids.reception}';`);
    await db.exec(`update public.profiles set role = 'receptionist' where id = '${ids.reception}';`);
  });
  assert.equal(
    (await db.query(`select role from public.profiles where id = '${ids.reception}'`)).rows[0].role,
    'receptionist',
  );
  console.log('PASS promoting and removing a second administrator remains possible');

  // 5. RLS still prevents a non-admin from changing their own role and from
  //    reading the audit trail.
  await asUser(ids.reception, async () => {
    await db.exec(`update public.profiles set role = 'admin' where id = '${ids.reception}';`);
    assert.equal(
      (await db.query(`select role from public.profiles where id = '${ids.reception}'`)).rows[0].role,
      'receptionist',
    );
    assert.equal((await db.query('select id from public.audit_logs')).rows.length, 0);
  });
  await asUser(ids.admin1, async () => {
    assert.ok((await db.query('select id from public.audit_logs')).rows.length >= 3);
  });
  console.log('PASS profile writes and audit reads remain admin-only under RLS');

  // 6. An administrator cannot delete their own active administrator profile.
  await asUser(ids.admin1, async () => {
    await expectFailure(
      () => db.exec(`delete from public.profiles where id = '${ids.admin1}';`),
      /own administrator/,
    );
  });
  console.log('PASS direct self-deletion is blocked');

  // 7. The final active administrator cannot be deleted, even without a caller
  //    (the service-role/Edge path).
  await expectFailure(
    () => db.exec(`delete from public.profiles where id = '${ids.admin1}';`),
    /At least one active administrator must remain/,
  );
  console.log('PASS last-active-administrator protection applies to deletion');

  // 8. Per-user permission overrides replace atomically, reject bad input and
  //    are readable only by the account itself or an administrator.
  const replacePermissions = (target, entries, reason = 'Permission test') =>
    db.query('select public.replace_profile_permissions($1, $2::jsonb, $3, $4)', [
      target,
      JSON.stringify(entries),
      reason,
      ids.admin1,
    ]);
  const overrideRows = async (target) =>
    (await db.query(
      `select permission_key, effect from public.profile_permissions where profile_id = $1 order by permission_key`,
      [target],
    )).rows;

  await replacePermissions(ids.parent, [
    { permissionKey: 'students:read', effect: 'grant' },
    { permissionKey: 'reports:read', effect: 'revoke' },
  ]);
  assert.equal((await overrideRows(ids.parent)).length, 2);
  await replacePermissions(ids.parent, [{ permissionKey: 'reports:read', effect: 'revoke' }]);
  assert.deepEqual(await overrideRows(ids.parent), [{ permission_key: 'reports:read', effect: 'revoke' }]);
  await replacePermissions(ids.parent, []);
  assert.equal((await overrideRows(ids.parent)).length, 0);
  console.log('PASS override replacement is atomic and can clear the set');

  await replacePermissions(ids.parent, [{ permissionKey: 'students:read', effect: 'grant' }]);
  await expectFailure(
    () => replacePermissions(ids.parent, [{ permissionKey: 'finance:destroy', effect: 'grant' }], 'Invalid key'),
    /Unknown permission/,
  );
  assert.deepEqual(await overrideRows(ids.parent), [{ permission_key: 'students:read', effect: 'grant' }]);
  await expectFailure(
    () => replacePermissions(ids.parent, [{ permissionKey: 'students:read', effect: 'allow' }], 'Invalid effect'),
    /grant or revoke/,
  );
  await expectFailure(
    () => replacePermissions(ids.parent, [{ permissionKey: 'students:read', effect: 'grant' }], 'ab'),
    /reason of 3 to 500/,
  );
  console.log('PASS invalid key, effect and reason are refused without changing the existing set');

  await asUser(ids.parent, async () => {
    await expectFailure(
      () => replacePermissions(ids.parent, [{ permissionKey: 'settings:write', effect: 'grant' }]),
      /permission denied/,
    );
  });
  console.log('PASS a browser session cannot replace overrides directly');

  await replacePermissions(ids.reception, [{ permissionKey: 'fees:write', effect: 'revoke' }]);
  await asUser(ids.parent, async () => {
    assert.deepEqual(await overrideRows(ids.parent), [{ permission_key: 'students:read', effect: 'grant' }]);
  });
  await asUser(ids.reception, async () => {
    assert.deepEqual(await overrideRows(ids.reception), [{ permission_key: 'fees:write', effect: 'revoke' }]);
    assert.equal((await db.query('select profile_id from public.profile_permissions')).rows.length, 1);
  });
  await asUser(ids.admin1, async () => {
    assert.equal((await db.query('select profile_id from public.profile_permissions')).rows.length, 2);
  });
  console.log('PASS overrides are readable by their account and by an administrator under RLS');

  // 9. A profile with linked history cannot be deleted; a clean profile can, and
  //    its overrides are removed by the cascade.
  await db.exec(`
    insert into public.offline_attendance_queue(client_operation_id, device_id, operation, payload, created_by)
    values ('delete-guard-1', 'device-1', 'check_in', '{}'::jsonb, '${ids.reception}');
  `);
  await expectFailure(
    () => db.exec(`delete from public.profiles where id = '${ids.reception}';`),
    /foreign key|violates/,
  );
  assert.equal((await overrideRows(ids.reception)).length, 1);
  await db.exec(`delete from public.offline_attendance_queue where client_operation_id = 'delete-guard-1';`);
  await db.exec(`delete from public.profiles where id = '${ids.reception}';`);
  assert.equal(
    (await db.query(`select id from public.profiles where id = '${ids.reception}'`)).rows.length,
    0,
  );
  assert.equal((await overrideRows(ids.reception)).length, 0);
  console.log('PASS linked history blocks deletion while a clean profile and its overrides are removed');

  console.log('LIMIT: simulated auth and RLS on a disposable engine; no PostgREST, Edge HTTP or staging session.');
} catch (error) {
  console.error(error.message);
  if (error.cause?.where) console.error(error.cause.where);
  process.exitCode = 1;
} finally {
  await db.close();
}
