import { expect } from '@playwright/test';
import { signIn, test } from './live-fixtures';
import { login } from './helpers';

test('coach RLS exposes assigned records and blocks unassigned reads and corrections', async ({ academy }) => {
  for (const [table, allowed, forbidden] of [
    ['batches', academy.batchId, academy.otherBatchId],
    ['students', academy.studentId, academy.otherStudentId],
    ['attendance_records', academy.attendanceId, academy.otherAttendanceId],
  ]) {
    const result = await academy.coach.from(table).select('id').in('id', [allowed, forbidden]);
    expect(result.error, table).toBeNull();
    expect(result.data, table).toEqual([{ id: allowed }]);
    const direct = await academy.coach.from(table).select('id').eq('id', forbidden);
    expect(direct.error).toBeNull();
    expect(direct.data).toEqual([]);
  }
  const correction = await academy.coach.rpc('coach_request_attendance_correction', { p_attendance_id: academy.otherAttendanceId, p_values: { status: 'present' }, p_reason: 'Unauthorized correction attempt' });
  expect(correction.error?.code).toBe('42501');
  const review = await academy.coach.rpc('resolve_attendance_correction', { p_correction_id: crypto.randomUUID(), p_approve: true });
  expect(review.error?.code).toBe('42501');
  const unchanged = await academy.admin.from('attendance_records').select('status').eq('id', academy.otherAttendanceId).single();
  expect(unchanged.data?.status).toBe('absent');
});

test('parent RLS exposes only linked child and denies unrelated parent and attendance data', async ({ academy }) => {
  const { client: parent, user } = await signIn('parent');
  const ownParent = await parent.from('parents').select('id').eq('profile_id', user.id).single();
  expect(ownParent.error).toBeNull();
  const link = await academy.admin.from('student_parents').insert({ student_id: academy.studentId, parent_id: ownParent.data!.id });
  expect(link.error).toBeNull();
  try {
    const students = await parent.from('students').select('id').in('id', [academy.studentId, academy.otherStudentId]);
    expect(students.error).toBeNull();
    expect(students.data).toEqual([{ id: academy.studentId }]);
    const attendance = await parent.from('attendance_records').select('id').in('id', [academy.attendanceId, academy.otherAttendanceId]);
    expect(attendance.error).toBeNull();
    expect(attendance.data).toEqual([{ id: academy.attendanceId }]);
    const parents = await parent.from('parents').select('id');
    expect(parents.error).toBeNull();
    expect(parents.data).toEqual([{ id: ownParent.data!.id }]);
    const write = await parent.from('attendance_records').update({ status: 'present' }).eq('id', academy.attendanceId).select('id');
    expect(write.error).toBeNull();
    expect(write.data).toEqual([]);
    const actual = await academy.admin.from('attendance_records').select('status').eq('id', academy.attendanceId).single();
    expect(actual.data?.status).toBe('absent');
  } finally {
    expect((await academy.admin.from('student_parents').delete().eq('student_id', academy.studentId).eq('parent_id', ownParent.data!.id)).error).toBeNull();
    await parent.auth.signOut();
  }
});

for (const role of ['coach', 'parent', 'receptionist'] as const) {
  test(`${role} cannot open routes outside their role`, async ({ page }) => {
    await login(page, `${role}@turf.local`);
    const forbidden = role === 'receptionist' ? ['/settings', '/reports', '/dashboard/admin'] : ['/students', '/fees', '/settings', '/reports', '/dashboard/admin'];
    for (const route of forbidden) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/unauthorized$/);
      await expect(page.getByRole('heading', { name: 'Your role cannot open this area' })).toBeVisible();
    }
  });
}

test('admin and receptionist can read both assigned and unassigned students', async ({ academy }) => {
  const { client: receptionist } = await signIn('receptionist');
  try {
    for (const client of [academy.admin, receptionist]) {
      const result = await client.from('students').select('id').in('id', [academy.studentId, academy.otherStudentId]);
      expect(result.error).toBeNull();
      expect(result.data?.map(row => row.id).sort()).toEqual([academy.studentId, academy.otherStudentId].sort());
    }
    const settings = await receptionist.from('academy_settings').update({ academy_name: 'Unauthorized test change' }).eq('id', true).select('id');
    expect(settings.error).toBeNull();
    expect(settings.data).toEqual([]);
  } finally { await receptionist.auth.signOut(); }
});
