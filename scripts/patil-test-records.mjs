import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Explicitly requested test fixture. Reuses the existing parent, student and enrollment.
const source = readFileSync('src/environments/environment.live.ts', 'utf8');
const client = createClient(source.match(/supabaseUrl:\s*'([^']+)'/)[1], source.match(/supabaseAnonKey:\s*'([^']+)'/)[1], { auth: { persistSession: false } });
const checked = async (request) => { const r = await request; if (r.error) throw r.error; return r.data; };
await checked(client.auth.signInWithPassword({ email: process.env.E2E_ADMIN_EMAIL ?? 'admin@turf.local', password: process.env.E2E_PASSWORD ?? 'academy123' }));
try {
  const parent = await checked(client.from('parents').select('*').eq('id', '321f6158-dc89-4c69-932b-67345736c1eb').single());
  if (parent.full_name !== 'Rahul Patil' || parent.whatsapp !== '+919130451715') throw Error('Parent identity changed; inspect before proceeding.');
  const matches = await checked(client.from('students').select('*').ilike('full_name', 'Sunil Patil'));
  if (matches.length > 1) throw Error('Ambiguous student matches.');
  let student = matches[0];
  const created = !student;
  if (student && student.date_of_birth !== '1992-06-07') throw Error('Existing student date of birth differs.');
  if (!student) student = await checked(client.from('students').insert({ full_name: 'Sunil Patil', student_code: 'TEST-SUNIL-PATIL-19920607', date_of_birth: '1992-06-07', status: 'active', notes: 'User-requested attendance/WhatsApp test record, 2026-10-21.' }).select('*').single());
  await checked(client.from('student_parents').upsert({ student_id: student.id, parent_id: parent.id, is_primary: true }, { onConflict: 'student_id,parent_id' }));
  // Attendance RPC requires a current enrollment. Use an existing test batch, not an age-restricted academy batch.
  let enrollment = await checked(client.from('enrollments').select('*').eq('student_id', student.id).eq('status', 'active').maybeSingle());
  if (!enrollment) {
    const batch = await checked(client.from('batches').select('*').eq('id', '6c4be28f-229d-4a45-b4a3-d74b83cedcaa').eq('status', 'active').single());
    enrollment = await checked(client.rpc('create_enrollment', { p_student_id: student.id, p_batch_id: batch.id, p_fee_plan_id: batch.fee_plan_id, p_valid_from: '2026-10-21', p_valid_till: null, p_notes: 'Requested attendance/WhatsApp test.' }));
  }
  const relationship = await checked(client.from('student_parents').select('*,parents(id,full_name,phone,whatsapp,status,communication_preferences),students(id,full_name,date_of_birth,status)').eq('student_id', student.id));
  const result = { parentId: parent.id, studentId: student.id, studentCreated: created, enrollment, relationship };
  writeFileSync('test-results/patil-records.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await client.auth.signOut(); }
