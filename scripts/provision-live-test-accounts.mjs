import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.E2E_PASSWORD;
const confirmed = process.env.CONFIRM_TEST_PROJECT;

if (!url || !serviceKey || !password) {
  throw new Error('VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and E2E_PASSWORD are required.');
}
if (confirmed !== 'yes') {
  throw new Error('Refusing to provision users. Set CONFIRM_TEST_PROJECT=yes for an isolated test project.');
}
if (password.length < 12 || password === 'academy123') {
  throw new Error('E2E_PASSWORD must be at least 12 characters and must not use the former shared default.');
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const accounts = [
  ['E2E_ADMIN_EMAIL', 'admin', 'Test Admin'],
  ['E2E_RECEPTIONIST_EMAIL', 'receptionist', 'Test Receptionist'],
  ['E2E_COACH_EMAIL', 'coach', 'Test Coach'],
  ['E2E_PARENT_EMAIL', 'parent', 'Test Parent'],
];

const users = [];
for (const [variable, role, fullName] of accounts) {
  const email = process.env[variable];
  if (!email) throw new Error(`${variable} is required.`);
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  let user = listed.data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
  if (user) {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (updated.error) throw updated.error;
    user = updated.data.user;
  } else {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (created.error) throw created.error;
    user = created.data.user;
  }
  users.push({ user, email, role, fullName });
}

const profiles = users.map(({ user, email, role, fullName }) => ({
  id: user.id, email, role, full_name: fullName, status: 'active', is_active: true,
}));
const profileResult = await admin.from('profiles').upsert(profiles);
if (profileResult.error) throw profileResult.error;

const coachUser = users.find(({ role }) => role === 'coach');
const parentUser = users.find(({ role }) => role === 'parent');
const coachResult = await admin.from('coaches').upsert({
  profile_id: coachUser.user.id, employee_code: 'E2E-COACH', full_name: coachUser.fullName,
  phone: '+919000000001', email: coachUser.email, status: 'active',
}, { onConflict: 'profile_id' }).select('id').single();
if (coachResult.error) throw coachResult.error;
const parentResult = await admin.from('parents').upsert({
  profile_id: parentUser.user.id, full_name: parentUser.fullName, relation: 'Guardian',
  phone: '+919000000002', email: parentUser.email, status: 'active',
}, { onConflict: 'profile_id' }).select('id').single();
if (parentResult.error) throw parentResult.error;

const [batches, students] = await Promise.all([
  admin.from('batches').select('id').eq('status', 'active').limit(2),
  admin.from('students').select('id').eq('status', 'active').limit(2),
]);
if (batches.error) throw batches.error;
if (students.error) throw students.error;
if (batches.data.length) {
  const links = await admin.from('batch_coaches').upsert(
    batches.data.map(({ id }) => ({ batch_id: id, coach_id: coachResult.data.id, is_primary: true })),
    { onConflict: 'batch_id,coach_id' },
  );
  if (links.error) throw links.error;
}
if (students.data.length) {
  const links = await admin.from('student_parents').upsert(
    students.data.map(({ id }) => ({ student_id: id, parent_id: parentResult.data.id, is_primary: true })),
    { onConflict: 'student_id,parent_id' },
  );
  if (links.error) throw links.error;
}

console.log('Live test identities provisioned in the confirmed test project.');
