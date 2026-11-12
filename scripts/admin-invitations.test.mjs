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
  const state = { invited: null, resent: null, invitationInsert: null, invitationUpdates: [], profileUpdates: [], audit: [], authBans: [] };
  let profilesSingleCalls = 0;

  const callerClient = { auth: { getUser: async () => ({ data: { user: options.signedOut ? null : { id: 'caller' } }, error: null }) } };

  const query = (table) => {
    const ctx = { table, op: 'select', single: null, head: false, update: null, insert: null };
    const q = {
      select: (_columns, meta) => { if (meta?.head) ctx.head = true; return q; },
      insert: (values) => { ctx.op = 'insert'; ctx.insert = values; return q; },
      update: (values) => { ctx.op = 'update'; ctx.update = values; return q; },
      eq: () => q, in: () => q, ilike: () => q, lt: () => q, order: () => q, limit: () => q, range: () => q,
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
        if (ctx.single === 'maybe') return { data: options.existingProfile ? { id: 'existing' } : null, error: null };
        if (ctx.single === 'one') {
          profilesSingleCalls += 1;
          if (profilesSingleCalls === 1) return { data: { role: options.callerRole ?? 'admin', status: 'active', is_active: true }, error: null };
          return { data: options.targetProfile ?? null, error: null };
        }
        return { data: [], error: null, count: 0 };
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
        return { data: [], error: null };
      }
      if (table === 'roles') {
        return { data: options.roleRows ?? null, error: options.rolesError ?? null };
      }
      return { data: null, error: null };
    };
    return q;
  };

  const adminClient = {
    from: (table) => query(table),
    auth: {
      admin: {
        inviteUserByEmail: async (email, input) => {
          state.invited = { email, ...input };
          return options.providerError ? { data: { user: null }, error: options.providerError } : { data: { user: { id: 'invitee' } }, error: null };
        },
        updateUserById: async (userId, input) => { state.authBans.push({ userId, ...input }); return { data: {}, error: options.banError ?? null }; },
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
    Response, URL, Map, Date, console: { error: () => undefined, warn: () => undefined, log: () => undefined },
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
