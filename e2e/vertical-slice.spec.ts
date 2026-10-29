import { expect } from '@playwright/test';
import { test } from './live-fixtures';
import { login } from './helpers';

test('staff registers a student, verifies enrollment, records a payment and generates a report', async ({ page, academy }) => {
  test.setTimeout(120_000);
  const today = new Date().toISOString().slice(0, 10);
  const fullName = `E2E Player${academy.suffix}`;
  academy.trackStudentName(fullName);
  let studentId: string;
  try {
    await login(page);
    await page.goto('/students/add');
    await page.getByLabel('First name').fill('E2E');
    await page.getByLabel('Last name').fill(`Player${academy.suffix}`);
    await page.getByLabel('Date of birth').fill('2014-04-12');
    await page.getByLabel('Phone number').fill('9765432101');
    await page.locator('input[formcontrolname="address"]').fill('12 Test Street');
    await page.getByLabel('City').fill('Pune');
    await page.getByLabel('PIN code').fill('411001');
    await page.getByLabel('Batch / program').selectOption(academy.batchId);
    await page.getByLabel('Joining date').fill(today);
    await page.getByLabel('Guardian name').fill(`E2E Guardian ${academy.suffix}`);
    await page.getByLabel('Guardian phone').fill('9765432101');
    await page.getByRole('button', { name: 'Save student', exact: true }).click();
    await expect(page).toHaveURL(/\/students$/);
    const created = await academy.admin.from('students').select('id').eq('full_name', fullName).single();
    expect(created.error).toBeNull();
    studentId = created.data!.id;
    const enrolled = await academy.admin.from('enrollments').select('id,batch_id,status').eq('student_id', studentId).single();
    expect(enrolled.error).toBeNull();
    expect(enrolled.data).toMatchObject({ batch_id: academy.batchId, status: 'active' });
    await page.goto('/attendance/manual-check-in');
    await page.getByPlaceholder('Search by name or student ID').fill(fullName);
    await page.getByRole('button', { name: new RegExp(fullName) }).click();
    await page.getByRole('button', { name: /Check In Student/ }).click();
    await expect(page.getByRole('status').filter({ hasText: fullName + ' checked in successfully.' })).toBeVisible();
    const attendance = await academy.admin.from('attendance_records').select('id,check_in_at,status').eq('student_id', studentId).single();
    expect(attendance.error).toBeNull();
    expect(attendance.data!.check_in_at).toBeTruthy();
    expect(attendance.data!.status).toBe('present');
    await page.goto('/attendance/manual-check-out');
    await page.getByPlaceholder('Search by name or student ID').fill(fullName);
    await page.getByRole('button', { name: new RegExp(fullName) }).click();
    await page.getByRole('button', { name: /Check Out Student/ }).click();
    await expect(page.getByRole('status').filter({ hasText: fullName + ' checked out successfully.' })).toBeVisible();
    const checkedOut = await academy.admin.from('attendance_records').select('status,check_out_at').eq('id', attendance.data!.id).single();
    expect(checkedOut.error).toBeNull();
    expect(checkedOut.data!.status).toBe('checked_out');
    expect(checkedOut.data!.check_out_at).toBeTruthy();
    const charge = await academy.admin.from('monthly_charges').insert({ student_id: studentId, enrollment_id: enrolled.data!.id, charge_month: `${today.slice(0, 7)}-01`, due_date: today, base_amount: 1000 }).select('id').single();
    expect(charge.error).toBeNull();
    await page.goto('/payments/new');
    await page.getByLabel('Outstanding charge').selectOption(charge.data!.id);
    await page.getByLabel('Amount').fill('500');
    await page.getByLabel('Payment mode').selectOption('cash');
    await page.getByRole('button', { name: 'Record payment' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Payment recorded and receipt generated.' })).toBeVisible();
    const balance = await academy.admin.from('monthly_charge_balances').select('paid_amount,balance_amount').eq('id', charge.data!.id).single();
    expect(balance.error).toBeNull();
    expect(Number(balance.data!.paid_amount)).toBe(500);
    expect(Number(balance.data!.balance_amount)).toBe(500);
    await page.goto('/payments/receipts');
    await expect(page.getByRole('row').filter({ hasText: fullName })).toBeVisible();
    await page.goto('/reports');
    await page.getByLabel('Report', { exact: true }).selectOption('fees');
    await page.getByLabel('Period', { exact: true }).selectOption('custom');
    await page.getByLabel('From', { exact: true }).fill(`${today.slice(0, 7)}-01`);
    await page.getByLabel('To', { exact: true }).fill(today);
    await page.getByRole('button', { name: 'Generate report' }).click();
    await expect(page.getByRole('row').filter({ hasText: fullName })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);
  } finally {
    // Resolve the unique test name even if navigation failed after the insert.
    const rows = await academy.admin.from('students').select('id').eq('full_name', fullName);
    expect(rows.error).toBeNull();
    for (const row of rows.data ?? []) {
      expect((await academy.admin.rpc('delete_student_profile', { p_student_id: row.id })).error).toBeNull();
    }
  }
});
