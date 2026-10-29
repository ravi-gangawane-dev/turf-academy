import { expect } from '@playwright/test';
import { test } from './live-fixtures';
import { login } from './helpers';

for (const approve of [true, false]) {
  test(`coach submits a correction and admin ${approve ? 'approves' : 'rejects'} the exact request`, async ({ page, browser, academy }) => {
    const reason = `E2E correction ${academy.suffix}`;
    await login(page, 'coach@turf.local');
    await page.goto('/coach/attendance/correction');
    await page.getByRole('combobox', { name: 'Attendance record', exact: true }).selectOption(academy.attendanceId);
    await page.getByLabel('Requested status').selectOption('present');
    await page.getByLabel('Reason', { exact: true }).fill(reason);
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Correction request submitted for academy review.' })).toBeVisible();
    const request = await academy.admin.from('attendance_corrections').select('*').eq('attendance_id', academy.attendanceId).single();
    expect(request.error).toBeNull();
    expect(request.data).toMatchObject({ requested_by: academy.coachUserId, resolution_status: 'pending', corrected_values: { status: 'present' }, reason });
    const before = await academy.admin.from('attendance_records').select('status').eq('id', academy.attendanceId).single();
    expect(before.data?.status).toBe('absent');
    const adminContext = await browser.newContext();
    try {
      const adminPage = await adminContext.newPage();
      await login(adminPage, 'admin@turf.local');
      await adminPage.goto('/attendance/correction');
      await adminPage.getByLabel('Filter reason', { exact: true }).fill(reason);
      await adminPage.getByLabel('Filter status', { exact: true }).fill('pending');
      const row = adminPage.getByRole('row').filter({ hasText: reason });
      await expect(row).toContainText('pending');
      if (!approve) {
        await row.getByRole('button', { name: 'Reject', exact: true }).click();
        await expect(adminPage.getByRole('alert').filter({ hasText: 'Enter a rejection reason' }).first()).toBeVisible();
        await adminPage.getByLabel('Review note / rejection reason').fill('Verified original attendance is correct');
      }
      await row.getByRole('button', { name: approve ? 'Approve' : 'Reject', exact: true }).click();
      await expect(row).toHaveCount(0);
      await adminPage.getByLabel('Filter status', { exact: true }).fill(approve ? 'approved' : 'rejected');
      await expect(row).toContainText(approve ? 'approved' : 'rejected');
      const resolved = await academy.admin.from('attendance_corrections').select('*').eq('id', request.data!.id).single();
      expect(resolved.error).toBeNull();
      expect(resolved.data!.resolution_status).toBe(approve ? 'approved' : 'rejected');
      expect(resolved.data!.resolved_at).toBeTruthy();
      if (!approve) expect(resolved.data!.resolution_reason).toBe('Verified original attendance is correct');
      const attendance = await academy.admin.from('attendance_records').select('status').eq('id', academy.attendanceId).single();
      expect(attendance.error).toBeNull();
      expect(attendance.data!.status).toBe(approve ? 'present' : 'absent');
      const repeated = await academy.admin.rpc('resolve_attendance_correction', { p_correction_id: request.data!.id, p_approve: approve });
      expect(repeated.error?.code).toBe('23505');
    } finally { await adminContext.close(); }
  });
}

test('concurrent correction requests create exactly one pending request', async ({ academy }) => {
  const args = { p_attendance_id: academy.attendanceId, p_values: { status: 'present' }, p_reason: `Concurrent ${academy.suffix}` };
  const results = await Promise.all([academy.coach.rpc('coach_request_attendance_correction', args), academy.coach.rpc('coach_request_attendance_correction', args)]);
  expect(results.filter(result => !result.error)).toHaveLength(1);
  expect(results.find(result => result.error)?.error?.code).toBe('23505');
  const pending = await academy.admin.from('attendance_corrections').select('id').eq('attendance_id', academy.attendanceId).eq('resolution_status', 'pending');
  expect(pending.error).toBeNull();
  expect(pending.data).toHaveLength(1);
});

test('duplicate attendance and checkout before check-in are rejected by the database', async ({ academy }) => {
  const duplicate = await academy.admin.from('attendance_records').insert({ student_id: academy.studentId, batch_id: academy.batchId, attendance_date: new Date().toISOString().slice(0, 10), status: 'present' });
  expect(duplicate.error?.code).toBe('23505');
  const invalid = await academy.admin.from('attendance_records').update({ check_in_at: '2026-09-17T10:00:00Z', check_out_at: '2026-09-17T09:00:00Z' }).eq('id', academy.attendanceId);
  expect(invalid.error?.code).toBe('23514');
  const unchanged = await academy.admin.from('attendance_records').select('status,check_in_at,check_out_at').eq('id', academy.attendanceId).single();
  expect(unchanged.error).toBeNull();
  expect(unchanged.data).toEqual({ status: 'absent', check_in_at: null, check_out_at: null });
});
