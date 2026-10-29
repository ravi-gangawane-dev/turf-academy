import { expect, test as base } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type TestRole = 'admin' | 'coach' | 'parent' | 'receptionist';
export async function signIn(role: TestRole) {
  const client = createClient(
    process.env['VITE_SUPABASE_URL'] ?? 'https://ttuigbkaluozglzgepsh.supabase.co',
    process.env['VITE_SUPABASE_ANON_KEY'] ?? 'sb_publishable_rWM0j3-x9zSCcGKeo_ImXw_lxNKPyyR',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const result = await client.auth.signInWithPassword({
    email: process.env[`E2E_${role.toUpperCase()}_EMAIL`] ?? `${role}@turf.local`,
    password: process.env['E2E_PASSWORD'] ?? 'academy123',
  });
  expect(result.error, `Valid ${role} test account is required`).toBeNull();
  return { client, user: result.data.user! };
}

interface AcademyFixture {
  admin: SupabaseClient;
  coach: SupabaseClient;
  coachUserId: string;
  batchId: string;
  otherBatchId: string;
  studentId: string;
  otherStudentId: string;
  attendanceId: string;
  otherAttendanceId: string;
  planId: string;
  suffix: string;
  trackStudentName: (name: string) => void;
}

export const test = base.extend<{ academy: AcademyFixture }>({
  academy: async (_fixtures, use) => {
    const adminAuth = await signIn('admin');
    const coachAuth = await signIn('coach');
    const admin = adminAuth.client, coach = coachAuth.client;
    const suffix = crypto.randomUUID().slice(0, 8);
    const cleanup: (() => PromiseLike<{ error: unknown }>)[] = [];
    // Fixture teardown gets its own timeout even if the test body times out.
    const trackStudentName = (name: string) => {
      if (!name.includes(suffix)) throw new Error('Tracked students must include the fixture suffix');
      cleanup.push(async () => {
        const rows = await admin.from('students').select('id').eq('full_name', name);
        if (rows.error) return { error: rows.error };
        for (const row of rows.data ?? []) {
          const result = await admin.rpc('delete_student_profile', { p_student_id: row.id });
          if (result.error) return { error: result.error };
        }
        return { error: null };
      });
    };
    async function insert(table: string, values: object) {
      const result = await admin.from(table).insert(values).select('id').single();
      expect(result.error, `Create ${table} fixture`).toBeNull();
      const id = result.data!.id as string;
      cleanup.push(() => admin.from(table).delete().eq('id', id));
      return id;
    }
    try {
      const coachRow = await coach.from('coaches').select('id').eq('profile_id', coachAuth.user.id).single();
      expect(coachRow.error).toBeNull();
      const planId = await insert('fee_plans', { name: `E2E Plan ${suffix}`, monthly_fee: 1000, duration_months: 1 });
      const batchId = await insert('batches', { code: `E2E-A-${suffix}`, name: `E2E Assigned ${suffix}`, capacity: 10, fee_plan_id: planId });
      const otherBatchId = await insert('batches', { code: `E2E-B-${suffix}`, name: `E2E Unassigned ${suffix}`, capacity: 10, fee_plan_id: planId });
      expect((await admin.from('batch_coaches').insert({ batch_id: batchId, coach_id: coachRow.data!.id })).error).toBeNull();
      const studentId = await insert('students', { student_code: `E2E-A-${suffix}`, full_name: `E2E Assigned ${suffix}`, date_of_birth: '2014-04-12' });
      const otherStudentId = await insert('students', { student_code: `E2E-B-${suffix}`, full_name: `E2E Unassigned ${suffix}`, date_of_birth: '2014-04-12' });
      const today = new Date().toISOString().slice(0, 10);
      for (const [student_id, batch_id] of [[studentId, batchId], [otherStudentId, otherBatchId]]) {
        await insert('enrollments', { student_id, batch_id, fee_plan_id: planId, valid_from: today, monthly_fee: 1000 });
      }
      const attendanceId = await insert('attendance_records', { student_id: studentId, batch_id: batchId, attendance_date: today, status: 'absent' });
      const otherAttendanceId = await insert('attendance_records', { student_id: otherStudentId, batch_id: otherBatchId, attendance_date: today, status: 'absent' });
      cleanup.push(() => admin.from('attendance_corrections').delete().in('attendance_id', [attendanceId, otherAttendanceId]));
      // Correction/history rows intentionally have no direct DELETE policy.
      // The admin-only profile RPC removes those dependencies transactionally.
      cleanup.push(() => admin.rpc('delete_student_profile', { p_student_id: studentId }));
      cleanup.push(() => admin.rpc('delete_student_profile', { p_student_id: otherStudentId }));
      await use({ admin, coach, coachUserId: coachAuth.user.id, batchId, otherBatchId, studentId, otherStudentId, attendanceId, otherAttendanceId, planId, suffix, trackStudentName });
    } finally {
      const errors: unknown[] = [];
      for (const remove of cleanup.reverse()) {
        const result = await remove();
        if (result.error) errors.push(result.error);
      }
      await Promise.all([admin.auth.signOut(), coach.auth.signOut()]);
      expect(errors, 'Every test-owned fixture must be removed').toEqual([]);
    }
  },
});
