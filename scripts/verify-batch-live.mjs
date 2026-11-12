import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://ttuigbkaluozglzgepsh.supabase.co';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_rWM0j3-x9zSCcGKeo_ImXw_lxNKPyyR';
let email = process.env.BATCH_TEST_EMAIL;
let password = process.env.BATCH_TEST_PASSWORD;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY.');

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const client = createClient(url, anonKey, { auth: { persistSession: false } });
const suffix = `api-${Date.now()}`;
let planId, batchA, batchB, studentId, coachId, enrollmentId;
let temporaryUserId;
const check = (label, result) => { if (result.error) throw new Error(`${label}: ${result.error.message}`); return result.data; };

try {
  if (process.env.BATCH_CREATE_TEST_USER === 'true') {
    const suffix = `api-${Date.now()}`;
    email = email || `${suffix}@example.invalid`;
    password = password || `Turf-${crypto.randomUUID()}!a1`;
    const createdUser = check('create temporary auth user', await admin.auth.admin.createUser({ email, password, email_confirm: true }));
    temporaryUserId = createdUser.user.id;
    check('configure temporary profile', await admin.from('profiles').upsert({ id: temporaryUserId, full_name: 'API Batch Test User', email, role: 'admin', status: 'active', is_active: true }));
  }
  if (!email || !password) throw new Error('Set BATCH_TEST_EMAIL and BATCH_TEST_PASSWORD, or use BATCH_CREATE_TEST_USER=true.');
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  const plan = check('create fee plan', await admin.from('fee_plans').insert({ name: `API test ${suffix}`, monthly_fee: 1, duration_months: 1, status: 'active' }).select('id').single()); planId = plan.id;
  const student = check('create student', await admin.from('students').insert({ student_code: `API-${suffix}`, full_name: 'API Batch Test Student', date_of_birth: '2014-01-01', status: 'active' }).select('id').single()); studentId = student.id;
  const batches = check('create batches', await admin.from('batches').insert([{ code: `API-A-${suffix}`, name: `API Batch A ${suffix}`, capacity: 1, waitlist_capacity: 1, fee_plan_id: planId, status: 'active' }, { code: `API-B-${suffix}`, name: `API Batch B ${suffix}`, capacity: 1, waitlist_capacity: 1, fee_plan_id: planId, status: 'active' }]).select('id')); [batchA, batchB] = batches;
  const coach = check('find active coach', await admin.from('coaches').select('id').eq('status', 'active').limit(1).single()); coachId = coach.id;
  const created = check('create enrollment', await client.rpc('create_enrollment', { p_student_id: studentId, p_batch_id: batchA.id, p_fee_plan_id: planId, p_valid_from: new Date().toISOString().slice(0, 10) })); enrollmentId = created.id;
  check('transfer enrollment', await client.rpc('transfer_enrollment', { p_enrollment_id: enrollmentId, p_batch_id: batchB.id, p_effective_on: new Date().toISOString().slice(0, 10), p_reason: 'API verification' }));
  check('assign coach', await client.rpc('set_batch_coach', { p_batch_id: batchB.id, p_coach_id: coachId, p_role: 'primary' }));
  check('add waitlist entry', await client.rpc('manage_batch_waitlist', { p_batch_id: batchA.id, p_student_id: studentId, p_action: 'add', p_valid_from: new Date().toISOString().slice(0, 10) }));
  const activity = check('read activity', await admin.from('enrollment_history').select('id').eq('enrollment_id', enrollmentId));
  console.log(JSON.stringify({ status: 'PASS', enrollmentId, activityEvents: activity.length }, null, 2));
} finally {
  if (batchA?.id || batchB?.id) await admin.from('batch_coaches').delete().in('batch_id', [batchA?.id, batchB?.id].filter(Boolean));
  if (enrollmentId) await admin.from('enrollment_history').delete().eq('enrollment_id', enrollmentId);
  if (enrollmentId) await admin.from('enrollments').delete().eq('id', enrollmentId);
  if (batchA?.id || batchB?.id) await admin.from('batch_waitlist').delete().in('batch_id', [batchA?.id, batchB?.id].filter(Boolean));
  if (batchA?.id || batchB?.id) await admin.from('batches').delete().in('id', [batchA?.id, batchB?.id].filter(Boolean));
  if (studentId) await admin.from('students').delete().eq('id', studentId);
  if (planId) await admin.from('fee_plans').delete().eq('id', planId);
  if (temporaryUserId) {
    await admin.from('profiles').delete().eq('id', temporaryUserId);
    await admin.auth.admin.deleteUser(temporaryUserId);
  }
}
