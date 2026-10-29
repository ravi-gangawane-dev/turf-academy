import { expect } from '@playwright/test';
import { test } from './live-fixtures';
import { login } from './helpers';

for (const role of ['admin', 'receptionist']) {
  test(`${role} identifies a QR token and confirms persisted check-in and checkout`, async ({
    page,
    academy,
  }) => {
    expect(
      (await academy.admin.from('attendance_records').delete().eq('id', academy.attendanceId))
        .error,
    ).toBeNull();
    const qr = await academy.admin
      .from('qr_profiles')
      .select('public_token')
      .eq('student_id', academy.studentId)
      .single();
    expect(qr.error).toBeNull();
    await login(page, `${role}@turf.local`);
    await page.goto('/attendance/qr');
    await page.getByLabel('Student QR code').fill(qr.data!.public_token);
    await page.getByRole('button', { name: 'Identify student' }).click();
    await expect(
      page.getByRole('heading', { name: `E2E Assigned ${academy.suffix} Identified` }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Confirm check in' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'checked in.' }).first()).toBeVisible();
    let stored = await academy.admin
      .from('attendance_records')
      .select('id,status,check_in_at,check_out_at,source')
      .eq('student_id', academy.studentId)
      .single();
    expect(stored.error).toBeNull();
    expect(stored.data).toMatchObject({ status: 'present', source: 'qr', check_out_at: null });
    expect(stored.data!.check_in_at).toBeTruthy();
    await page.getByRole('button', { name: 'Identify student' }).click();
    await page.getByRole('button', { name: 'Confirm check out' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'checked out.' }).first(),
    ).toBeVisible();
    stored = await academy.admin
      .from('attendance_records')
      .select('id,status,check_in_at,check_out_at,source')
      .eq('student_id', academy.studentId)
      .single();
    expect(stored.data!.status).toBe('checked_out');
    expect(stored.data!.check_out_at).toBeTruthy();
    await page.getByRole('button', { name: 'Identify student' }).click();
    await expect(page.getByRole('button', { name: 'Already checked out' })).toBeDisabled();
  });
}

test('manual attendance surfaces failed writes without a success notice', async ({
  page,
  academy,
}) => {
  await login(page, 'receptionist@turf.local');
  await page.goto('/attendance/manual-check-in');
  await expect(page.getByRole('button', { name: 'Mark Check In' })).toBeDisabled();
  await page
    .getByRole('searchbox', { name: 'Search students', exact: true })
    .fill(`E2E Assigned ${academy.suffix}`);
  await page.getByRole('checkbox', { name: new RegExp(`Check in E2E Assigned ${academy.suffix}`) }).check();
  await page.route('**/rest/v1/rpc/attendance_check_in', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Attendance service unavailable' }),
    }),
  );
  await page.getByRole('button', { name: 'Mark Check In' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'This request could not be completed. Please try again.' }).first(),
  ).toBeVisible();
  await expect(page.getByText(/checked in successfully/)).toHaveCount(0);
  const row = await academy.admin
    .from('attendance_records')
    .select('status,check_in_at')
    .eq('id', academy.attendanceId)
    .single();
  expect(row.data).toEqual({ status: 'absent', check_in_at: null });
});

test('offline QR check-in syncs once with its original source after reconnecting', async ({
  page,
  context,
  academy,
}) => {
  expect(
    (await academy.admin.from('attendance_records').delete().eq('id', academy.attendanceId)).error,
  ).toBeNull();
  const qr = await academy.admin
    .from('qr_profiles')
    .select('public_token')
    .eq('student_id', academy.studentId)
    .single();
  expect(qr.error).toBeNull();
  await login(page, 'receptionist@turf.local');
  await page.goto('/attendance/qr');
  await page.getByLabel('Student QR code').fill(qr.data!.public_token);
  await page.getByRole('button', { name: 'Identify student' }).click();
  await expect(page.getByRole('button', { name: 'Confirm check in' })).toBeEnabled();
  await context.setOffline(true);
  try {
    await page.getByRole('button', { name: 'Confirm check in' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Attendance queued offline.' }),
    ).toBeVisible();
    const before = await academy.admin
      .from('attendance_records')
      .select('id')
      .eq('student_id', academy.studentId);
    expect(before.error).toBeNull();
    expect(before.data).toEqual([]);
  } finally {
    await context.setOffline(false);
  }
  await expect
    .poll(async () => {
      const stored = await academy.admin
        .from('attendance_records')
        .select('status,source')
        .eq('student_id', academy.studentId);
      expect(stored.error).toBeNull();
      return stored.data;
    })
    .toEqual([{ status: 'present', source: 'qr' }]);
  await page.goto('/attendance/offline-queue');
  await expect(
    page.getByText('No queued attendance records.', { exact: true }),
  ).toBeVisible();
});
