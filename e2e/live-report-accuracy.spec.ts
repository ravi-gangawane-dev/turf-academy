import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { test, signIn } from './live-fixtures';
import { login } from './helpers';

test('batch reports and parent totals retain partial refunds across all payment history', async ({ page, academy }) => {
  test.setTimeout(180_000);
  const parentAuth = await signIn('parent');
  const parent = await academy.admin.from('parents').select('id').eq('profile_id', parentAuth.user.id).single();
  expect(parent.error).toBeNull();
  try {
    expect((await academy.admin.from('student_parents').insert({ student_id: academy.studentId, parent_id: parent.data!.id })).error).toBeNull();
    const month = new Date().toISOString().slice(0, 7);
    const payments: string[] = [];
    for (const studentId of [academy.studentId, academy.otherStudentId]) {
      const enrollment = await academy.admin.from('enrollments').select('id').eq('student_id', studentId).single();
      expect(enrollment.error).toBeNull();
      const charge = await academy.admin.from('monthly_charges').insert({
        student_id: studentId, enrollment_id: enrollment.data!.id, charge_month: `${month}-01`, due_date: `${month}-10`, base_amount: 2000,
      }).select('id').single();
      expect(charge.error).toBeNull();
      for (let i = 0; i < (studentId === academy.studentId ? 12 : 1); i++) {
        const payment = await academy.admin.rpc('record_payment', { p_charge_id: charge.data!.id, p_amount: studentId === academy.studentId ? 100.05 : 250, p_mode: 'cash', p_client_reference: `report-${academy.suffix}-${studentId}-${i}` });
        expect(payment.error).toBeNull();
        if (studentId === academy.studentId) payments.push(payment.data.payment.id);
      }
    }
    for (const [id, amount] of [[payments[0], 25.25], [payments[1], 100.05]] as const) {
      expect((await academy.admin.rpc('refund_payment', { p_payment_id: id, p_amount: amount, p_reason: 'Report regression refund', p_client_reference: `report-refund-${id}` })).error).toBeNull();
    }

    // Exercise a different configured currency without changing shared academy settings.
    await page.route('**/rest/v1/academy_settings?*', async route => {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      const data = await response.json();
      await route.fulfill({ response, json: Array.isArray(data) ? data.map(row => ({ ...row, currency_code: 'USD' })) : { ...data, currency_code: 'USD' } });
    });
    await login(page);
    await page.goto('/reports');
    await page.getByLabel('From', { exact: true }).fill(`${month}-01`);
    const end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).toISOString().slice(0, 10);
    await page.getByLabel('To', { exact: true }).fill(end);
    await page.getByLabel('Batch', { exact: true }).selectOption(academy.batchId);
    await page.getByLabel('Report', { exact: true }).selectOption('revenue');
    await page.getByRole('button', { name: 'Generate report' }).click();
    await expect(page.locator('.report-summary article').filter({ hasText: 'Net collected' })).toContainText('$1,075.30');
    await expect(page.locator('.report-summary article').filter({ hasText: 'Refunded' })).toContainText('$125.30');
    await expect(page.locator('tbody tr')).toHaveCount(12);
    await expect(page.locator('tbody')).not.toContainText(`E2E Unassigned ${academy.suffix}`);
    const pendingDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await pendingDownload;
    try {
      const csv = await readFile((await download.path())!, 'utf8');
      expect(csv.trim().split(/\r?\n/)).toHaveLength(13);
      expect(csv).toContain('"$74.80"');
      expect(csv).toContain('"$0.00"');
      expect(csv).not.toContain('₹');
    } finally { await download.delete(); }
    for (const type of ['fees', 'pending']) {
      await page.getByLabel('Report', { exact: true }).selectOption(type);
      await page.getByRole('button', { name: 'Generate report' }).click();
      await expect(page.locator('tbody tr')).toHaveCount(1);
      await expect(page.locator('tbody')).toContainText(`E2E Assigned ${academy.suffix}`);
      await expect(page.locator('.report-summary')).toContainText('$924.70');
    }
    await page.getByLabel('Report', { exact: true }).selectOption('revenue');
    await page.getByLabel('Batch', { exact: true }).selectOption(academy.otherBatchId);
    await page.getByRole('button', { name: 'Generate report' }).click();
    await expect(page.locator('.report-summary article').filter({ hasText: 'Net collected' })).toContainText('$250.00');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await login(page, 'parent@turf.local');
    await page.goto(`/parent/children/${academy.studentId}`);
    const total = page.locator('.summary-metrics article').filter({ hasText: 'Total paid' });
    await expect(total).toContainText('$1,075.30');
    await page.reload();
    await expect(total).toContainText('$1,075.30');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const unrelated = await parentAuth.client.from('payments').select('id').eq('student_id', academy.otherStudentId);
    expect(unrelated.error).toBeNull(); expect(unrelated.data).toEqual([]);
    const refunds = await parentAuth.client.from('payment_refunds').select('amount,payment:payments!inner(student_id)').eq('payment.student_id', academy.studentId);
    expect(refunds.error).toBeNull(); expect(refunds.data).toHaveLength(2);
  } finally {
    expect((await academy.admin.from('student_parents').delete().eq('student_id', academy.studentId).eq('parent_id', parent.data!.id)).error).toBeNull();
    await parentAuth.client.auth.signOut();
  }
});

test('large reports export every row and coach search finds records beyond the first server page', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  const rows = Array.from({ length: 1203 }, (_, i) => ({ id: `attendance-${i}`, attendance_date: '2026-09-01', student: { full_name: `Report student ${i}`, student_code: `R${i}` }, batch: { name: 'Large batch' }, status: 'present' }));
  await page.route('**/rest/v1/attendance_records?*', route => {
    const offset = Number(new URL(route.request().url()).searchParams.get('offset') ?? 0);
    const data = rows.slice(offset, offset + 251);
    return route.fulfill({ json: data, headers: { 'Content-Range': `${offset}-${offset + data.length - 1}/${rows.length}` } });
  });
  await page.goto('/reports');
  await page.getByRole('button', { name: 'Generate report' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1203);
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await pendingDownload;
  try {
    const csv = await readFile((await download.path())!, 'utf8');
    expect(csv.trim().split(/\r?\n/)).toHaveLength(1204);
    expect(csv).toContain('Report student 1202');
  } finally { await download.delete(); }
  await page.route('**/rest/v1/coaches?*', route => {
    const offset = Number(new URL(route.request().url()).searchParams.get('offset') ?? 0);
    const data = Array.from({ length: Math.min(251, 1203 - offset) }, (_, j) => ({ id: `coach-${offset + j}`, full_name: offset + j === 1202 ? 'Last Coach' : `Large Coach ${offset + j}`, phone: '9000000000', status: 'active', coach_specializations: [] }));
    return route.fulfill({ json: data, headers: { 'Content-Range': `${offset}-${offset + data.length - 1}/1203` } });
  });
  await page.goto('/coaches');
  await expect(page.locator('.coach-summary article').first()).toContainText('1203');
  await page.getByRole('button', { name: 'Next page' }).click();
  await page.getByPlaceholder('Search coaches...').fill('Last Coach');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('Last Coach');
});
