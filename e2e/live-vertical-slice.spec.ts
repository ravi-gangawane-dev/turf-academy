import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const url = process.env['VITE_SUPABASE_URL'] ?? 'https://ttuigbkaluozglzgepsh.supabase.co';
const key = process.env['VITE_SUPABASE_ANON_KEY'] ?? 'sb_publishable_rWM0j3-x9zSCcGKeo_ImXw_lxNKPyyR';

test('live registration, enrollment, attendance, payment, and reporting workflow', async () => {
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = await admin.auth.signInWithPassword({
    email: process.env['E2E_ADMIN_EMAIL'] ?? 'admin@turf.local',
    password: process.env['E2E_PASSWORD'] ?? 'academy123',
  });
  expect(auth.error).toBeNull();
  const suffix = crypto.randomUUID().slice(0, 8);
  let studentId = '';
  let parentId = '';
  let enrollmentId = '';
  let attendanceId = '';
  let chargeId = '';
  let paymentId = '';
  try {
    const fixture = await admin.from('batches').select('id,fee_plan_id,fee_plans(id,monthly_fee)').eq('status', 'active').not('fee_plan_id', 'is', null).limit(1).single();
    expect(fixture.error).toBeNull();
    const plan = fixture.data!.fee_plans as unknown as { id: string; monthly_fee: number };

    const student = await admin.from('students').insert({
      student_code: `E2E-${suffix}`,
      full_name: `E2E Player ${suffix}`,
      date_of_birth: '2014-04-12',
      phone: `9${String(Date.now()).slice(-9)}`,
      joined_on: new Date().toISOString().slice(0, 10),
      created_by: auth.data.user!.id,
    }).select('id').single();
    expect(student.error).toBeNull();
    studentId = student.data!.id;

    const parent = await admin.from('parents').insert({
      full_name: `E2E Guardian ${suffix}`,
      relation: 'Guardian',
      phone: `8${String(Date.now()).slice(-9)}`,
    }).select('id').single();
    expect(parent.error).toBeNull();
    parentId = parent.data!.id;
    expect((await admin.from('student_parents').insert({ student_id: studentId, parent_id: parentId, is_primary: true })).error).toBeNull();

    const enrollment = await admin.from('enrollments').insert({
      student_id: studentId,
      batch_id: fixture.data!.id,
      fee_plan_id: plan.id,
      valid_from: new Date().toISOString().slice(0, 10),
      monthly_fee: plan.monthly_fee,
      created_by: auth.data.user!.id,
    }).select('id').single();
    expect(enrollment.error).toBeNull();
    enrollmentId = enrollment.data!.id;

    const attendance = await admin.from('attendance_records').insert({
      student_id: studentId,
      batch_id: fixture.data!.id,
      attendance_date: new Date().toISOString().slice(0, 10),
      check_in_at: new Date().toISOString(),
      status: 'present',
      source: 'manual',
      recorded_by: auth.data.user!.id,
      idempotency_key: `e2e-vertical-${suffix}`,
    }).select('id').single();
    expect(attendance.error).toBeNull();
    attendanceId = attendance.data!.id;

    const month = `${new Date().toISOString().slice(0, 7)}-01`;
    const charge = await admin.from('monthly_charges').insert({
      enrollment_id: enrollmentId,
      student_id: studentId,
      charge_month: month,
      due_date: new Date().toISOString().slice(0, 10),
      base_amount: plan.monthly_fee,
    }).select('id').single();
    expect(charge.error).toBeNull();
    chargeId = charge.data!.id;
    const payment = await admin.from('payments').insert({
      student_id: studentId,
      monthly_charge_id: chargeId,
      amount: Math.min(500, Number(plan.monthly_fee)),
      payment_mode: 'cash',
      client_reference: `E2E-${suffix}`,
      recorded_by: auth.data.user!.id,
    }).select('id').single();
    expect(payment.error).toBeNull();
    paymentId = payment.data!.id;

    const report = await admin.from('monthly_charge_balances').select('student_id,paid_amount,balance_amount').eq('student_id', studentId).single();
    expect(report.error).toBeNull();
    expect(Number(report.data!.paid_amount)).toBeGreaterThan(0);
  } finally {
    if (paymentId) await admin.from('payments').delete().eq('id', paymentId);
    if (chargeId) await admin.from('monthly_charges').delete().eq('id', chargeId);
    if (attendanceId) await admin.from('attendance_records').delete().eq('id', attendanceId);
    if (enrollmentId) await admin.from('enrollments').delete().eq('id', enrollmentId);
    if (studentId && parentId) await admin.from('student_parents').delete().eq('student_id', studentId).eq('parent_id', parentId);
    if (studentId) await admin.from('students').delete().eq('id', studentId);
    if (parentId) await admin.from('parents').delete().eq('id', parentId);
    await admin.auth.signOut();
  }
});
