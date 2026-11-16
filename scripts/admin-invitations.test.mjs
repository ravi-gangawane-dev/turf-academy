import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('supabase/functions/admin-manage-users/index.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(options = {}) {
  let handler;
  const state = { invited: null, resent: null, invitationInsert: null, invitationUpdates: [], profileUpdates: [], roleDeletes: [], audit: [], authBans: [], authDeletes: [], authCreated: [], rpc: [] };
  const permissionKeys = options.permissionKeys ?? [
    'coach:portal', 'children:read', 'students:read', 'students:write',
    'parents:read', 'parents:write', 'coaches:read', 'coaches:write',
    'batches:read', 'batches:write', 'enrollments:write', 'attendance:read',
    'attendance:write', 'fees:write', 'notifications:read', 'reports:read',
    'settings:write',
  ];
  let profilesSingleCalls = 0;

  const callerClient = { auth: { getUser: async () => ({ data: { user: options.signedOut ? null : { id: 'caller' } }, error: null }) } };

  const query = (table) => {
    const ctx = { table, op: 'select', single: null, head: false, update: null, insert: null, neq: false, inValues: null };
    const q = {
      select: (_columns, meta) => { if (meta?.head) ctx.head = true; return q; },
      insert: (values) => { ctx.op = 'insert'; ctx.insert = values; return q; },
      update: (values) => { ctx.op = 'update'; ctx.update = values; return q; },
      delete: () => { ctx.op = 'delete'; return q; },
      eq: () => q, in: (_column, values) => { ctx.inValues = values; return q; },
      neq: () => { ctx.neq = true; return q; },
      ilike: () => q, lt: () => q, order: () => q, limit: () => q, range: () => q,
      maybeSingle: () => { ctx.single = 'maybe'; return q; },
      single: () => { ctx.single = 'one'; return q; },
      then: (resolve, reject) => Promise.resolve(resolveQuery()).then(resolve, reject),
    };
    const resolveQuery = () => {
      if (table === 'profiles') {
        if (ctx.op === 'update') {
          state.profileUpdates.push(ctx.update);
          if (ctx.single) return { data: options.missingProfile ? null : { id: 'invitee', ...ctx.update }, error: null };
          return { data: null, error: null };
        }
        if (ctx.head) return { data: null, count: options.activeAdmins ?? 2, error: null };
        if (ctx.neq) return { data: options.otherAdmins ?? [], error: null };
        if (ctx.single === 'maybe') {
          if (options.roleTarget !== undefined) return { data: options.roleTarget, error: null };
          if (options.permissionTarget !== undefined) return { data: options.permissionTarget, error: null };
          if (options.deleteTarget) return { data: options.deleteTarget, error: null };
          return { data: options.existingProfile ? { id: 'existing' } : null, error: null };
        }
        if (ctx.single === 'one') {
          profilesSingleCalls += 1;
          if (profilesSingleCalls === 1) return { data: { role: options.callerRole ?? 'admin', status: 'active', is_active: true }, error: null };
          return { data: options.targetProfile ?? null, error: null };
        }
        return { data: options.listProfiles ?? [], error: null, count: (options.listProfiles ?? []).length };
      }
      if (table === 'permissions') {
        if (options.permissionsError) return { data: null, error: options.permissionsError };
        return { data: permissionKeys.map((key) => ({ key })), error: null };
      }
      if (table === 'profile_permissions') {
        if (options.profilePermissionsError) return { data: null, error: options.profilePermissionsError };
        if (ctx.inValues) return { data: options.revokedAdmins ?? [], error: null };
        return { data: options.profilePermissions ?? [], error: null };
      }
      if (table === 'profile_roles') {
        if (options.profileRolesError) return { data: null, error: options.profileRolesError };
        if (ctx.op === 'delete') {
          state.roleDeletes.push({ ...ctx });
          return { data: null, error: null };
        }
        if (ctx.inValues) return { data: options.profileRolesForList ?? [], error: null };
        return { data: options.profileRoles ?? [], error: null };
      }
      if (table === 'user_invitations') {
        if (ctx.op === 'update') {
          state.invitationUpdates.push(ctx.update);
          if (ctx.single) return { data: { id: 'inv-new', ...ctx.update }, error: null };
          return { data: null, error: null };
        }
        if (ctx.op === 'insert') {
          state.invitationInsert = ctx.insert;
          return { data: { id: 'inv-new', ...ctx.insert }, error: null };
        }
        if (ctx.single) return { data: options.invitation ?? options.liveInvitation ?? null, error: null };
        return { data: options.invitationList ?? [], error: null };
      }
      if (table === 'audit_logs') {
        if (ctx.op === 'insert') { state.audit.push(ctx.insert); return { data: null, error: null }; }
        if (ctx.head) return { data: null, count: options.historyTable === table ? 1 : 0, error: null };
        return { data: [], error: null };
      }
      if (table === 'roles') {
        return { data: options.roleRows ?? null, error: options.rolesError ?? null };
      }
      if (ctx.head) return { data: null, count: options.historyTable === table ? 1 : 0, error: null };
      return { data: null, error: null };
    };
    return q;
  };

  const adminClient = {
    from: (table) => query(table),
    rpc: async (name, args) => {
      state.rpc.push({ name, args });
      return options.rpcError ? { data: null, error: options.rpcError } : { data: null, error: null };
    },
    auth: {
      admin: {
        inviteUserByEmail: async (email, input) => {
          state.invited = { email, ...input };
          return options.providerError ? { data: { user: null }, error: options.providerError } : { data: { user: { id: 'invitee' } }, error: null };
        },
        createUser: async (input) => {
          state.authCreated.push(input);
          return options.createError
            ? { data: { user: null }, error: options.createError }
            : { data: { user: { id: 'created-user' } }, error: null };
        },
        updateUserById: async (userId, input) => { state.authBans.push({ userId, ...input }); return { data: {}, error: options.banError ?? null }; },
        deleteUser: async (userId) => {
          state.authDeletes.push(userId);
          return options.deleteError
            ? { data: { user: null }, error: options.deleteError }
            : { data: { user: { id: userId } }, error: null };
        },
      },
      resend: async (input) => {
        state.resent = input;
        return options.resendError ? { data: {}, error: options.resendError } : { data: {}, error: null };
      },
    },
  };

  let clientCount = 0;
  vm.runInNewContext(source, {
    exports: {},
    require: () => ({ createClient: () => (++clientCount % 2 ? callerClient : adminClient) }),
    Deno: {
      env: {
        get: (key) => key === 'INVITE_REDIRECT_URL'
          ? (options.noRedirect ? undefined : options.redirect ?? 'https://academy.example/auth/reset-password')
          : 'test',
      },
      serve: (fn) => { handler = fn; },
    },
    Response, URL, Map, Date, Uint32Array, crypto: globalThis.crypto, console: { error: () => undefined, warn: () => undefined, log: () => undefined },
  });

  return {
    run: (body) => handler(new Request('https://edge.example', {
      method: 'POST',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invite', fullName: 'Test Person', email: 'PERSON@example.com', role: 'admin', ...body }),
    })),
    state: () => state,
  };
}

test('invites with the server redirect and verifies the selected role', async () => {
  const s = setup();
  const r = await s.run({ redirectTo: 'https://attacker.example' });
  assert.equal(r.status, 201);
  assert.equal(s.state().invited.redirectTo, 'https://academy.example/auth/reset-password');
  assert.equal(s.state().invited.email, 'person@example.com');
  assert.equal(s.state().invited.data.role_label, 'Administrator');
  assert.equal(s.state().profileUpdates[0].role, 'admin');
  assert.equal(s.state().invitationInsert.status, 'pending');
  assert.equal(s.state().audit[0].action, 'invitation_sent');
});

test('accepts the /auth/set-password redirect path', async () => {
  const s = setup({ redirect: 'https://academy.example/auth/set-password' });
  assert.equal((await s.run({})).status, 201);
});

test('uses the role label stored in the database catalogue', async () => {
  const s = setup({
    roleRows: [
      { key: 'admin', label: 'Academy Owner' },
      { key: 'receptionist', label: 'Front desk' },
      { key: 'coach', label: 'Cricket coach' },
      { key: 'parent', label: 'Guardian' },
    ],
  });
  const r = await s.run({ role: 'admin' });
  assert.equal(r.status, 201);
  assert.equal(s.state().invited.data.role_label, 'Academy Owner');
});

test('falls back to the built-in roles when the catalogue table is unavailable', async () => {
  const s = setup({ rolesError: { code: '42P01', message: 'relation "roles" does not exist' } });
  const r = await s.run({ role: 'admin' });
  assert.equal(r.status, 201);
  assert.equal(s.state().invited.data.role_label, 'Administrator');
});

test('rejects non-https or unrelated redirect targets', async () => {
  const s = setup({ redirect: 'http://academy.example/auth/reset-password' });
  const r = await s.run({});
  assert.equal(r.status, 503);
  assert.equal(s.state().invited, null);
});

test('non-admin cannot invite', async () => {
  const s = setup({ callerRole: 'parent' });
  assert.equal((await s.run({})).status, 403);
  assert.equal(s.state().invited, null);
});

test('expired identity cannot invite', async () => {
  const s = setup({ signedOut: true });
  assert.equal((await s.run({})).status, 401);
});

test('missing trusted redirect prevents sending email', async () => {
  const s = setup({ noRedirect: true });
  assert.equal((await s.run({})).status, 503);
  assert.equal(s.state().invited, null);
});

test('missing profile cannot be reported as a successful invitation', async () => {
  const s = setup({ missingProfile: true });
  const r = await s.run({});
  assert.equal(r.status, 502);
  assert.equal((await r.json()).code, 'invite_profile_failed');
  assert.equal(s.state().invitationUpdates.at(-1).status, 'failed');
});

test('invalid role prevents sending', async () => {
  const s = setup();
  assert.equal((await s.run({ role: 'owner' })).status, 400);
  assert.equal(s.state().invited, null);
});

test('an existing account is rejected without sending another email', async () => {
  const s = setup({ existingProfile: true });
  const r = await s.run({});
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'account_exists');
  assert.equal(s.state().invited, null);
});

test('a pending invitation is not duplicated', async () => {
  const s = setup({ liveInvitation: { id: 'inv-old', status: 'pending', attempt_count: 1 } });
  const r = await s.run({});
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'invitation_pending');
  assert.equal(s.state().invited, null);
  assert.equal(s.state().invitationInsert, null);
});

test('a previously failed invitation is retried on the same row', async () => {
  const s = setup({ liveInvitation: { id: 'inv-old', status: 'failed', attempt_count: 2 } });
  const r = await s.run({});
  assert.equal(r.status, 201);
  assert.equal(s.state().invitationInsert, null);
  assert.equal(s.state().invitationUpdates.find((u) => u.attempt_count !== undefined).attempt_count, 3);
});

for (const [error, status, code] of [
  [{ code: 'email_address_not_authorized' }, 503, 'invite_smtp_required'],
  [{ code: 'email_address_invalid' }, 400, 'invite_email_invalid'],
  [{ code: 'email_exists' }, 409, 'account_exists'],
  [{ status: 429 }, 429, 'invite_rate_limited'],
  [{ message: 'private SMTP error' }, 502, 'invite_delivery_failed'],
]) {
  test(`safe invitation error ${code}`, async () => {
    const s = setup({ providerError: error });
    const r = await s.run({});
    assert.equal(r.status, status);
    const body = await r.json();
    assert.equal(body.code, code);
    assert.ok(!String(body.error).includes('private'));
    assert.equal(s.state().profileUpdates.length, 0);
    assert.equal(s.state().invitationUpdates.at(-1).status, 'failed');
  });
}

test('resend uses Supabase Auth delivery for the existing auth user', async () => {
  const s = setup({ invitation: { id: 'inv-1', status: 'pending', auth_user_id: 'invitee', attempt_count: 1, expires_at: '2026-01-01' } });
  const r = await s.run({ action: 'resend', fullName: 'Test Person' });
  assert.equal(r.status, 200);
  assert.equal(JSON.stringify(s.state().resent), JSON.stringify({ type: 'signup', email: 'person@example.com', options: { emailRedirectTo: 'https://academy.example/auth/reset-password' } }));
  assert.equal(s.state().invitationUpdates.at(-1).status, 'pending');
});

test('resend is refused for an accepted invitation', async () => {
  const s = setup({ invitation: { id: 'inv-1', status: 'accepted', auth_user_id: 'invitee', attempt_count: 1 } });
  const r = await s.run({ action: 'resend' });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'already_accepted');
  assert.equal(s.state().resent, null);
});

test('revoking an accepted invitation is refused', async () => {
  const s = setup({ invitation: { id: 'inv-1', status: 'accepted', email: 'person@example.com' } });
  const r = await s.run({ action: 'revoke', invitationId: 'inv-1' });
  assert.equal(r.status, 409);
});

test('revoking a pending invitation records the status', async () => {
  const s = setup({ invitation: { id: 'inv-1', status: 'pending', email: 'person@example.com' } });
  const r = await s.run({ action: 'revoke', invitationId: 'inv-1' });
  assert.equal(r.status, 200);
  assert.equal(s.state().invitationUpdates.at(-1).status, 'revoked');
});

test('creating a user returns a one-time temporary password and audits without it', async () => {
  const s = setup();
  const r = await s.run({ action: 'create' });
  assert.equal(r.status, 201);
  const body = await r.json();
  assert.equal(body.email, 'person@example.com');
  assert.equal(body.role, 'admin');
  assert.match(body.temporaryPassword, /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{16}$/);
  assert.equal(s.state().authCreated[0].email, 'person@example.com');
  assert.equal(s.state().authCreated[0].password, body.temporaryPassword);
  assert.equal(s.state().authCreated[0].email_confirm, true);
  assert.equal(s.state().authCreated[0].user_metadata.must_change_password, true);
  assert.equal(s.state().profileUpdates[0].role, 'admin');
  assert.equal(s.state().profileUpdates[0].onboarding_completed_at, null);
  const entry = s.state().audit[0];
  assert.equal(entry.action, 'user_created');
  assert.equal(entry.new_values.email, 'person@example.com');
  assert.equal(JSON.stringify(entry).includes(body.temporaryPassword), false);
});

test('two created accounts do not share a temporary password', async () => {
  const first = await (await setup().run({ action: 'create' })).json();
  const second = await (await setup().run({ action: 'create' })).json();
  assert.notEqual(first.temporaryPassword, second.temporaryPassword);
});

test('creating a user refuses an email that already has a profile', async () => {
  const s = setup({ existingProfile: true });
  const r = await s.run({ action: 'create' });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'account_exists');
  assert.equal(s.state().authCreated.length, 0);
});

test('creating a user requires a catalogue role', async () => {
  const s = setup();
  assert.equal((await s.run({ action: 'create', role: 'owner' })).status, 400);
  assert.equal(s.state().authCreated.length, 0);
});

test('a provider failure while creating is reported without leaking details', async () => {
  const s = setup({ createError: { code: 'unexpected', status: 500, message: 'private failure' } });
  const r = await s.run({ action: 'create' });
  assert.equal(r.status, 502);
  const body = await r.json();
  assert.equal(body.code, 'create_failed');
  assert.ok(!body.error.includes('private'));
  assert.equal(s.state().audit.length, 0);
});

test('a profile that cannot be prepared rolls the new login back', async () => {
  const s = setup({ missingProfile: true });
  const r = await s.run({ action: 'create' });
  assert.equal(r.status, 502);
  assert.equal((await r.json()).code, 'create_profile_failed');
  assert.deepEqual(s.state().authDeletes, ['created-user']);
  assert.equal(s.state().audit.length, 0);
});

test('the last active administrator cannot be demoted', async () => {
  const s = setup({ activeAdmins: 1, targetProfile: { role: 'admin', status: 'active', is_active: true } });
  const r = await s.run({ action: 'update', userId: 'other-admin', role: 'coach', status: 'active', reason: 'Role reassignment' });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'last_admin');
  assert.equal(s.state().profileUpdates.length, 0);
});

test('suspending a user also bans the auth session', async () => {
  const s = setup({ targetProfile: { role: 'coach', status: 'active' } });
  const r = await s.run({ action: 'update', userId: 'coach-1', role: 'coach', status: 'suspended', reason: 'Access review' });
  assert.equal(r.status, 200);
  assert.equal(s.state().profileUpdates[0].is_active, false);
  assert.equal(s.state().authBans[0].ban_duration, '876000h');
});

test('a failed sign-in restriction is reported instead of silently succeeding', async () => {
  const s = setup({ targetProfile: { role: 'coach', status: 'active' }, banError: { code: 'unexpected' } });
  const r = await s.run({ action: 'update', userId: 'coach-1', role: 'coach', status: 'suspended', reason: 'Access review' });
  assert.equal(r.status, 502);
  assert.equal((await r.json()).code, 'access_partial');
});

test('unexpected failures do not leak internal messages', async () => {
  const s = setup({ liveInvitation: { id: 'inv-old', status: 'failed', attempt_count: 1 } });
  s.state().invitationInsert = null;
  const r = await s.run({ email: 'not-an-email' });
  assert.equal(r.status, 400);
});


test('audit action accepts the exact Users history request and returns pagination', async () => {
  const s = setup();
  const r = await s.run({ action: 'audit', page: 1, pageSize: 5 });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { rows: [], total: 0, page: 1, pageSize: 5 });
});

test('non-admin cannot read access history', async () => {
  const s = setup({ callerRole: 'coach' });
  const r = await s.run({ action: 'audit', page: 1, pageSize: 5 });
  assert.equal(r.status, 403);
});

test('list accepts the exact Users first-page request', async () => {
  const s = setup();
  const r = await s.run({
    action: 'list', page: 1, pageSize: 5, search: '', role: '', status: '',
    filters: { name: '', contact: '', role: '', status: '', joined: '' },
    sortBy: 'createdAt', sortDirection: 'desc',
  });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { users: [], total: 0, page: 1, pageSize: 5 });
});

const deletableAccount = {
  id: 'coach-1',
  full_name: 'Coach One',
  email: 'coach@example.com',
  role: 'coach',
  status: 'active',
  is_active: true,
};

test('deletes an account with no linked history and records the reason', async () => {
  const s = setup({ deleteTarget: deletableAccount });
  const r = await s.run({ action: 'delete', userId: 'coach-1', reason: 'Duplicate test account' });
  assert.equal(r.status, 200);
  assert.deepEqual(s.state().authDeletes, ['coach-1']);
  const entry = s.state().audit.at(-1);
  assert.equal(entry.action, 'user_deleted');
  assert.equal(entry.table_name, 'profiles');
  assert.equal(entry.record_id, 'coach-1');
  assert.equal(entry.new_values.reason, 'Duplicate test account');
  assert.equal(entry.new_values.before.email, 'coach@example.com');
});

test('a deletion with linked records is refused and nothing is removed', async () => {
  const s = setup({ deleteTarget: deletableAccount, historyTable: 'payments' });
  const r = await s.run({ action: 'delete', userId: 'coach-1', reason: 'Duplicate test account' });
  assert.equal(r.status, 409);
  const body = await r.json();
  assert.equal(body.code, 'account_has_history');
  assert.ok(body.blockers.includes('payments'));
  assert.deepEqual(s.state().authDeletes, []);
  assert.equal(s.state().audit.length, 0);
});

test('an administrator cannot delete their own account', async () => {
  const s = setup();
  const r = await s.run({ action: 'delete', userId: 'caller', reason: 'Testing self delete' });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'self_delete');
  assert.deepEqual(s.state().authDeletes, []);
});

test('the last active administrator cannot be deleted', async () => {
  const s = setup({
    activeAdmins: 1,
    deleteTarget: { ...deletableAccount, id: 'admin-2', role: 'admin' },
  });
  const r = await s.run({ action: 'delete', userId: 'admin-2', reason: 'Removing final admin' });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'last_admin');
  assert.deepEqual(s.state().authDeletes, []);
});

test('a deletion requires a reason', async () => {
  const s = setup({ deleteTarget: deletableAccount });
  const r = await s.run({ action: 'delete', userId: 'coach-1', reason: ' ' });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, 'reason_required');
  assert.deepEqual(s.state().authDeletes, []);
});

test('a failed provider delete is reported without leaking details', async () => {
  const s = setup({
    deleteTarget: deletableAccount,
    deleteError: { code: 'unexpected', status: 500, message: 'private failure' },
  });
  const r = await s.run({ action: 'delete', userId: 'coach-1', reason: 'Duplicate test account' });
  assert.equal(r.status, 502);
  const body = await r.json();
  assert.equal(body.code, 'delete_failed');
  assert.ok(!body.error.includes('private'));
  assert.equal(s.state().audit.length, 0);
});

const permissionAccount = { id: 'coach-1', role: 'coach', status: 'active', is_active: true };

test('permissions returns the role and existing overrides for an account', async () => {
  const s = setup({
    permissionTarget: permissionAccount,
    profilePermissions: [
      { permission_key: 'attendance:read', effect: 'grant', reason: 'Cover reception', created_at: '2026-11-16T00:00:00Z' },
      { permission_key: 'reports:read', effect: 'revoke', reason: 'Not required', created_at: '2026-11-16T00:00:00Z' },
    ],
  });
  const r = await s.run({ action: 'permissions', userId: 'coach-1' });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), {
    userId: 'coach-1',
    role: 'coach',
    overrides: [
      { permissionKey: 'attendance:read', effect: 'grant', reason: 'Cover reception' },
      { permissionKey: 'reports:read', effect: 'revoke', reason: 'Not required' },
    ],
  });
});

test('permissions is refused for an account that no longer exists', async () => {
  const s = setup();
  const r = await s.run({ action: 'permissions', userId: 'missing' });
  assert.equal(r.status, 404);
  assert.equal((await r.json()).code, 'user_not_found');
});

test('permissions reports the migration gap instead of pretending there are none', async () => {
  const s = setup({ permissionTarget: permissionAccount, profilePermissionsError: { code: '42P01' } });
  const r = await s.run({ action: 'permissions', userId: 'coach-1' });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).code, 'permissions_unavailable');
});

test('set_permissions replaces the override set atomically and audits before/after', async () => {
  const s = setup({
    permissionTarget: permissionAccount,
    profilePermissions: [{ permission_key: 'reports:read', effect: 'revoke' }],
  });
  const r = await s.run({
    action: 'set_permissions',
    userId: 'coach-1',
    reason: 'Cover reception during leave',
    overrides: [
      { permissionKey: 'attendance:read', effect: 'grant' },
      { permissionKey: 'reports:read', effect: 'revoke' },
    ],
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.message, 'Permission overrides saved.');
  assert.equal(s.state().rpc.length, 1);
  assert.equal(s.state().rpc[0].name, 'replace_profile_permissions');
  assert.equal(s.state().rpc[0].args.target_profile, 'coach-1');
  assert.equal(s.state().rpc[0].args.change_reason, 'Cover reception during leave');
  assert.equal(JSON.stringify(s.state().rpc[0].args.entries), JSON.stringify([
    { permissionKey: 'attendance:read', effect: 'grant' },
    { permissionKey: 'reports:read', effect: 'revoke' },
  ]));
  const entry = s.state().audit.at(-1);
  assert.equal(entry.action, 'user_permissions_changed');
  assert.equal(entry.record_id, 'coach-1');
  assert.equal(entry.new_values.reason, 'Cover reception during leave');
  assert.equal(JSON.stringify(entry.new_values.before), JSON.stringify([{ permissionKey: 'reports:read', effect: 'revoke' }]));
  assert.equal(JSON.stringify(entry.new_values.after), JSON.stringify([
    { permissionKey: 'attendance:read', effect: 'grant' },
    { permissionKey: 'reports:read', effect: 'revoke' },
  ]));
});

test('set_permissions accepts an empty list to clear every override', async () => {
  const s = setup({ permissionTarget: permissionAccount });
  const r = await s.run({ action: 'set_permissions', userId: 'coach-1', reason: 'Back to role defaults', overrides: [] });
  assert.equal(r.status, 200);
  assert.equal(s.state().rpc[0].args.entries.length, 0);
});

test('set_permissions rejects a permission key the catalogue does not know', async () => {
  const s = setup({ permissionTarget: permissionAccount });
  const r = await s.run({
    action: 'set_permissions',
    userId: 'coach-1',
    reason: 'Try an invented permission',
    overrides: [{ permissionKey: 'finance:destroy', effect: 'grant' }],
  });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, 'invalid_permissions');
  assert.equal(s.state().rpc.length, 0);
});

test('set_permissions rejects an unknown effect', async () => {
  const s = setup({ permissionTarget: permissionAccount });
  const r = await s.run({
    action: 'set_permissions',
    userId: 'coach-1',
    reason: 'Try an invalid effect',
    overrides: [{ permissionKey: 'reports:read', effect: 'allow' }],
  });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, 'invalid_permissions');
  assert.equal(s.state().rpc.length, 0);
});

test('set_permissions rejects the same key twice', async () => {
  const s = setup({ permissionTarget: permissionAccount });
  const r = await s.run({
    action: 'set_permissions',
    userId: 'coach-1',
    reason: 'Duplicate entries',
    overrides: [
      { permissionKey: 'reports:read', effect: 'grant' },
      { permissionKey: 'reports:read', effect: 'revoke' },
    ],
  });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, 'invalid_permissions');
  assert.equal(s.state().rpc.length, 0);
});

test('set_permissions requires a reason', async () => {
  const s = setup({ permissionTarget: permissionAccount });
  const r = await s.run({ action: 'set_permissions', userId: 'coach-1', reason: ' ', overrides: [] });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, 'reason_required');
  assert.equal(s.state().rpc.length, 0);
});

test('set_permissions refuses to remove the caller own settings access', async () => {
  const s = setup({ permissionTarget: { id: 'caller', role: 'admin', status: 'active', is_active: true } });
  const r = await s.run({
    action: 'set_permissions',
    userId: 'caller',
    reason: 'Remove own settings access',
    overrides: [{ permissionKey: 'settings:write', effect: 'revoke' }],
  });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'self_lockout');
  assert.equal(s.state().rpc.length, 0);
});

test('set_permissions keeps at least one administrator with settings access', async () => {
  const s = setup({
    permissionTarget: { id: 'admin-2', role: 'admin', status: 'active', is_active: true },
    otherAdmins: [],
  });
  const r = await s.run({
    action: 'set_permissions',
    userId: 'admin-2',
    reason: 'Remove settings access',
    overrides: [{ permissionKey: 'settings:write', effect: 'revoke' }],
  });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'last_admin');
  assert.equal(s.state().rpc.length, 0);
});

test('set_permissions refuses when every other administrator already lost settings access', async () => {
  const s = setup({
    permissionTarget: { id: 'admin-2', role: 'admin', status: 'active', is_active: true },
    otherAdmins: [{ id: 'admin-3' }, { id: 'admin-4' }],
    revokedAdmins: [{ profile_id: 'admin-3' }, { profile_id: 'admin-4' }],
  });
  const r = await s.run({
    action: 'set_permissions',
    userId: 'admin-2',
    reason: 'Remove settings access',
    overrides: [{ permissionKey: 'settings:write', effect: 'revoke' }],
  });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'last_admin');
  assert.equal(s.state().rpc.length, 0);
});

test('set_permissions allows removing settings access while another admin keeps it', async () => {
  const s = setup({
    permissionTarget: { id: 'admin-2', role: 'admin', status: 'active', is_active: true },
    otherAdmins: [{ id: 'admin-3' }, { id: 'admin-4' }],
    revokedAdmins: [{ profile_id: 'admin-3' }],
  });
  const r = await s.run({
    action: 'set_permissions',
    userId: 'admin-2',
    reason: 'Remove settings access',
    overrides: [{ permissionKey: 'settings:write', effect: 'revoke' }],
  });
  assert.equal(r.status, 200);
  assert.equal(s.state().rpc.length, 1);
});

test('set_permissions reports a failed replacement without leaking details', async () => {
  const s = setup({ permissionTarget: permissionAccount, rpcError: { code: 'XX000', message: 'private failure' } });
  const r = await s.run({
    action: 'set_permissions',
    userId: 'coach-1',
    reason: 'Cover reception',
    overrides: [{ permissionKey: 'reports:read', effect: 'grant' }],
  });
  assert.equal(r.status, 502);
  const body = await r.json();
  assert.equal(body.code, 'permission_update_failed');
  assert.ok(!body.error.includes('private'));
  assert.equal(s.state().audit.length, 0);
});

test('set_permissions reports an unavailable catalogue instead of accepting the keys', async () => {
  const s = setup({ permissionTarget: permissionAccount, permissionsError: { code: '42P01' } });
  const r = await s.run({
    action: 'set_permissions',
    userId: 'coach-1',
    reason: 'Cover reception',
    overrides: [{ permissionKey: 'reports:read', effect: 'grant' }],
  });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).code, 'permissions_unavailable');
  assert.equal(s.state().rpc.length, 0);
});

const roleAccount = { id: 'coach-1', role: 'coach', status: 'active', is_active: true };

test('the user list includes every assigned role and falls back to the primary role', async () => {
  const s = setup({
    listProfiles: [roleAccount],
    profileRolesForList: [
      { profile_id: 'coach-1', role_key: 'coach' },
      { profile_id: 'coach-1', role_key: 'receptionist' },
    ],
  });
  const r = await s.run({
    action: 'list', page: 1, pageSize: 5, search: '', role: '', status: '',
    filters: { name: '', contact: '', role: '', status: '', joined: '' },
    sortBy: 'createdAt', sortDirection: 'desc',
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(JSON.stringify(body.users[0].roles), JSON.stringify(['coach', 'receptionist']));

  const fallback = setup({ listProfiles: [roleAccount], profileRolesError: { code: '42P01' } });
  const fallbackResponse = await fallback.run({
    action: 'list', page: 1, pageSize: 5, search: '', role: '', status: '',
    filters: { name: '', contact: '', role: '', status: '', joined: '' },
    sortBy: 'createdAt', sortDirection: 'desc',
  });
  assert.equal(JSON.stringify((await fallbackResponse.json()).users[0].roles), JSON.stringify(['coach']));
});

test('set_roles replaces the assignment set and audits before/after', async () => {
  const s = setup({
    roleTarget: roleAccount,
    profileRoles: [{ role_key: 'coach' }, { role_key: 'receptionist' }],
  });
  const r = await s.run({
    action: 'set_roles',
    userId: 'coach-1',
    reason: 'Also covers reception',
    roles: ['coach', 'receptionist', 'admin'],
  });
  assert.equal(r.status, 200);
  assert.equal(JSON.stringify(await r.json()), JSON.stringify({
    message: 'Role assignments saved.',
    roles: ['coach', 'receptionist', 'admin'],
  }));
  assert.equal(s.state().rpc[0].name, 'replace_profile_roles');
  assert.equal(s.state().rpc[0].args.target_profile, 'coach-1');
  assert.equal(s.state().rpc[0].args.change_reason, 'Also covers reception');
  assert.equal(JSON.stringify(s.state().rpc[0].args.role_keys), JSON.stringify(['coach', 'receptionist', 'admin']));
  const entry = s.state().audit.at(-1);
  assert.equal(entry.action, 'user_roles_changed');
  assert.equal(entry.record_id, 'coach-1');
  assert.equal(entry.new_values.reason, 'Also covers reception');
  assert.equal(JSON.stringify(entry.new_values.before), JSON.stringify(['coach', 'receptionist']));
  assert.equal(JSON.stringify(entry.new_values.after), JSON.stringify(['coach', 'receptionist', 'admin']));
});

test('set_roles requires the primary role to stay assigned', async () => {
  const s = setup({ roleTarget: roleAccount });
  const r = await s.run({
    action: 'set_roles',
    userId: 'coach-1',
    reason: 'Try to drop the primary role',
    roles: ['receptionist'],
  });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, 'invalid_roles');
  assert.equal(s.state().rpc.length, 0);
});

test('set_roles rejects an unknown role, a duplicate and an empty set', async () => {
  for (const roles of [['coach', 'finance'], ['coach', 'coach'], []]) {
    const s = setup({ roleTarget: roleAccount });
    const r = await s.run({ action: 'set_roles', userId: 'coach-1', reason: 'Invalid selection', roles });
    assert.equal(r.status, 400);
    assert.equal((await r.json()).code, 'invalid_roles');
    assert.equal(s.state().rpc.length, 0);
  }
});

test('set_roles requires a reason and an existing account', async () => {
  const noReason = setup({ roleTarget: roleAccount });
  const reasonResponse = await noReason.run({ action: 'set_roles', userId: 'coach-1', reason: ' ', roles: ['coach'] });
  assert.equal(reasonResponse.status, 400);
  assert.equal((await reasonResponse.json()).code, 'reason_required');

  const missing = setup({ roleTarget: null });
  const missingResponse = await missing.run({ action: 'set_roles', userId: 'missing', reason: 'Assign roles', roles: ['coach'] });
  assert.equal(missingResponse.status, 404);
  assert.equal((await missingResponse.json()).code, 'user_not_found');
});

test('set_roles reports the migration gap instead of pretending the roles were saved', async () => {
  const s = setup({ roleTarget: roleAccount, profileRolesError: { code: '42P01' } });
  const r = await s.run({ action: 'set_roles', userId: 'coach-1', reason: 'Assign roles', roles: ['coach', 'admin'] });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).code, 'roles_unavailable');
  assert.equal(s.state().rpc.length, 0);
});

test('set_roles reports a failed replacement without leaking details', async () => {
  const s = setup({ roleTarget: roleAccount, rpcError: { code: 'XX000', message: 'private failure' } });
  const r = await s.run({ action: 'set_roles', userId: 'coach-1', reason: 'Assign roles', roles: ['coach', 'admin'] });
  assert.equal(r.status, 502);
  const body = await r.json();
  assert.equal(body.code, 'role_update_failed');
  assert.ok(!body.error.includes('private'));
  assert.equal(s.state().audit.length, 0);
});

test('changing the primary role drops the previous primary assignment', async () => {
  const s = setup({ targetProfile: { role: 'coach', status: 'active', is_active: true } });
  const r = await s.run({ action: 'update', userId: 'admin-2', role: 'receptionist', status: 'active', reason: 'Role change' });
  assert.equal(r.status, 200);
  assert.equal(s.state().roleDeletes.length, 1);
  assert.equal(s.state().roleDeletes[0].table, 'profile_roles');
  assert.equal(s.state().profileUpdates[0].role, 'receptionist');
});
