// Disposable PostgreSQL engine, never a remote database.
// Verifies the role/permission catalogue migration, its seed and RLS grants.
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

async function asRole(role, work) {
  await db.exec(`set role ${role};`);
  try {
    return await work();
  } finally {
    await db.exec('reset role;');
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
  await apply('202611040002_role_catalog');

  // 1. The catalogue is seeded with every role and permission used by the app.
  const roles = (await db.query('select key, label, rank, is_staff from public.roles order by rank')).rows;
  assert.deepEqual(
    roles.map((row) => row.key),
    ['admin', 'receptionist', 'coach', 'parent'],
  );
  assert.equal(roles[0].label, 'Administrator');
  assert.equal(roles[3].is_staff, false);

  const permissionCount = (await db.query('select key from public.permissions')).rows.length;
  assert.equal(permissionCount, 17);

  const grants = (
    await db.query(
      `select role_key, permission_key from public.role_permissions order by role_key, permission_key`,
    )
  ).rows;
  const byRole = (role) =>
    grants.filter((row) => row.role_key === role).map((row) => row.permission_key);
  assert.equal(byRole('admin').length, 15);
  assert.deepEqual(byRole('coach'), ['coach:portal']);
  assert.deepEqual(byRole('parent'), ['children:read']);
  assert.ok(byRole('admin').includes('settings:write'));
  assert.ok(!byRole('admin').includes('coach:portal'));
  assert.ok(!byRole('receptionist').includes('reports:read'));
  console.log('PASS catalogue seeds 4 roles, 17 permissions and the reviewed matrix');

  // 2. A signed-in account can read the catalogue through RLS.
  await asRole('authenticated', async () => {
    assert.equal((await db.query('select key from public.roles')).rows.length, 4);
    assert.equal((await db.query('select key from public.permissions')).rows.length, 17);
    assert.equal((await db.query('select * from public.role_permissions')).rows.length, 29);
  });
  console.log('PASS authenticated can read roles, permissions and role_permissions');

  // 3. Browser sessions cannot write the catalogue; only reviewed service-role
  //    operations can. This keeps the matrix from being widened by a token.
  await asRole('authenticated', async () => {
    await expectFailure(
      () => db.exec(`update public.roles set label = 'Everything' where key = 'coach';`),
      /permission denied/,
    );
    await expectFailure(
      () => db.exec(`insert into public.role_permissions(role_key, permission_key) values ('coach', 'settings:write');`),
      /permission denied/,
    );
    assert.equal(
      (await db.query(`select label from public.roles where key = 'coach'`)).rows[0].label,
      'Coach',
    );
  });
  console.log('PASS authenticated writes are denied');

  // 4. Anonymous visitors cannot read the catalogue.
  await asRole('anon', async () => {
    await expectFailure(
      () => db.query('select key from public.roles'),
      /permission denied/,
    );
  });
  console.log('PASS anonymous reads are denied');

  // 5. A service-role operation can update labels and grants for a later release.
  await asRole('service_role', async () => {
    await db.exec(`update public.roles set label = 'Cricket Coach' where key = 'coach';`);
    await db.exec(`update public.permissions set label = 'Coach workspace' where key = 'coach:portal';`);
  });
  assert.equal(
    (await db.query(`select label from public.roles where key = 'coach'`)).rows[0].label,
    'Cricket Coach',
  );
  console.log('PASS service role can maintain the catalogue');

  console.log('LIMIT: simulated auth and RLS on a disposable engine; no PostgREST or staging session.');
} catch (error) {
  console.error(error.message);
  if (error.cause?.where) console.error(error.cause.where);
  process.exitCode = 1;
} finally {
  await db.close();
}
