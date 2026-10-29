// Read-only live acceptance checks. Never queues, claims, sends, or changes records.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { VerificationBlocked, verifyOwnership } from './notification-verification.mjs';

const source = readFileSync(new URL('../src/environments/environment.live.ts', import.meta.url), 'utf8');
const url = process.env.VITE_SUPABASE_URL ?? source.match(/supabaseUrl:\s*'([^']+)'/)?.[1];
const key = process.env.VITE_SUPABASE_ANON_KEY ?? source.match(/supabaseAnonKey:\s*'([^']+)'/)?.[1];
if (!url || !key) throw new Error('Missing live Supabase configuration.');
const results = [];
async function check(name, action) {
  try { await action(); results.push({ name, status: 'PASS' }); }
  catch (error) { results.push({ name, status: error instanceof VerificationBlocked ? 'BLOCKED' : 'FAIL', reason: error.message }); }
}
function require(condition, message) { if (!condition) throw new Error(message); }
async function edge(token, body, method = 'POST') {
  return fetch(`${url}/functions/v1/notification-delivery`, {
    method, headers: { apikey: key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
}
await check('Edge rejects anonymous configuration', async () => {
  require((await edge(null, { action: 'configuration' })).status === 401, 'Expected HTTP 401');
});
await check('Edge rejects invalid JWT', async () => {
  require((await edge('invalid-token', { action: 'configuration' })).status === 401, 'Expected HTTP 401');
});
for (const role of ['admin', 'receptionist', 'parent', 'coach']) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
  });
  let session;
  await check(`${role}: real Auth sign-in and profile`, async () => {
    const login = await client.auth.signInWithPassword({
      email: process.env[`E2E_${role.toUpperCase()}_EMAIL`] ?? `${role}@turf.local`,
      password: process.env.E2E_PASSWORD ?? 'academy123',
    });
    require(!login.error && login.data.session, login.error?.message ?? 'No session');
    session = login.data.session;
    const profile = await client.from('profiles').select('role,is_active,status').eq('id', session.user.id).single();
    require(!profile.error && profile.data?.role === role && profile.data.is_active && profile.data.status === 'active', 'Test account must have the expected active role');
  });
  if (!session) continue;
  try {
    await check(`${role}: notification PostgREST read and ownership`, async () => {
      const list = await client.from('notifications').select('id,parent_id,coach_id').limit(100);
      require(!list.error, list.error?.message);
      if (role === 'parent' || role === 'coach') {
        const table = role === 'parent' ? 'parents' : 'coaches';
        const owner = await client.from(table).select('id').eq('profile_id', session.user.id).maybeSingle();
        require(!owner.error, owner.error?.message);
        verifyOwnership(list.data, owner.data, role);
      }
    });
    await check(`${role}: Edge configuration authorization`, async () => {
      const response = await edge(session.access_token, { action: 'configuration' });
      const staff = role === 'admin' || role === 'receptionist';
      require(response.status === (staff ? 200 : 403), `Unexpected HTTP ${response.status}`);
      if (staff) require(Array.isArray((await response.json()).channels), 'Missing channels response');
    });
    if (role === 'admin') {
      await check('Edge rejects unsupported action', async () => {
        require((await edge(session.access_token, { action: 'acceptance_invalid' })).status === 400, 'Expected HTTP 400');
      });
      await check('Edge rejects GET', async () => {
        require((await edge(session.access_token, null, 'GET')).status === 405, 'Expected HTTP 405');
      });
    }
  } finally { await client.auth.signOut({ scope: 'local' }); }
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), target: url, results,
  limits: 'Read-only sample (up to 100 rows per role). Does not establish empty-inbox isolation, inactive-account behavior, concurrent claims, provider sending, backup recovery, or migration deployment.' }, null, 2));
if (results.some(result => result.status !== 'PASS')) process.exitCode = 1;
