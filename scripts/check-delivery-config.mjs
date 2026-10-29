import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Read-only check of the notification-delivery Edge Function's channel configuration.
// Signs in with the documented E2E admin test account (never a client account) and calls
// the function's `configuration` action, which reports which external channels have their
// secrets configured. Sends nothing.
// Usage: node scripts/check-delivery-config.mjs
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src/environments/environment.live.ts'), 'utf8');
const url = source.match(/supabaseUrl:\s*'([^']+)'/)?.[1];
const key = source.match(/supabaseAnonKey:\s*'([^']+)'/)?.[1];
if (!url || !key) throw new Error('Could not read Supabase config from environment.live.ts');

const email = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@turf.local';
const password = process.env['E2E_PASSWORD'] ?? 'academy123';

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (signInError || !session.session) {
  console.error(`Sign-in failed for the test admin account: ${signInError?.message}`);
  process.exit(1);
}
const response = await supabase.functions.invoke('notification-delivery', {
  body: { action: 'configuration' },
});
if (response.error) {
  console.error(`Configuration probe failed: ${response.error.message}`);
  process.exit(1);
}
const channels = response.data?.channels ?? [];
console.log(`Configured external channels: ${channels.length ? channels.join(', ') : '(none)'}`);
console.log(`Raw response: ${JSON.stringify(response.data)}`);
const external = channels.filter((channel) => channel !== 'in_app');
if (external.length) {
  console.log('External delivery is configured and ready for an authorized-recipient test.');
  process.exit(0);
}
console.log('No external channel is configured yet. Set the edge-function secrets listed in');
console.log('docs/NOTIFICATION_DELIVERY_SETUP.md, then rerun this script.');
process.exit(2);
