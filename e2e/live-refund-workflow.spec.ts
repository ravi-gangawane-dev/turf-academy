import { createClient } from '@supabase/supabase-js';
import { expect } from '@playwright/test';
import { test, signIn } from './live-fixtures';
import { login } from './helpers';

test('admin completes partial and full refunds, retries safely and sees updated balances', async ({
  page,
  academy,
}) => {
  test.setTimeout(180_000);
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!key)
    throw new Error('Refund fixture cleanup requires the operator key in the process environment.');
  const cleanupClient = createClient('https://ttuigbkaluozglzgepsh.supabase.co', key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const enrollment = await academy.admin
    .from('enrollments')
    .select('id')
    .eq('student_id', academy.studentId)
    .single();
  expect(enrollment.error).toBeNull();
  const month = new Date().toISOString().slice(0, 7);
  const charge = await academy.admin
    .from('monthly_charges')
    .insert({
      student_id: academy.studentId,
      enrollment_id: enrollment.data!.id,
      charge_month: `${month}-01`,
      due_date: `${month}-10`,
      base_amount: 100.5,
    })
    .select('id')
    .single();
  expect(charge.error).toBeNull();
  const payment = await academy.admin.rpc('record_payment', {
    p_charge_id: charge.data!.id,
    p_amount: 100.5,
    p_mode: 'cash',
    p_client_reference: `refund-ui-${academy.suffix}`,
  });
  expect(payment.error).toBeNull();
  const paymentId = payment.data.payment.id;
  const name = `E2E Assigned ${academy.suffix}`;
  const refunds = () =>
    academy.admin.from('payment_refunds').select('amount,reason').eq('payment_id', paymentId);
  try {
    await login(page);
    await page.goto(`/payments/refunds?student=${academy.studentId}`);
    const row = page.locator('.refund-row').filter({ hasText: name });
    await row.getByRole('button', { name: 'Refund', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Amount')).toHaveValue('100.5');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await refunds()).data).toHaveLength(0);
    await row.getByRole('button', { name: 'Refund', exact: true }).click();
    await dialog.getByLabel('Amount').fill('101');
    await dialog.getByLabel('Reason').fill('Refund verification');
    await dialog.getByRole('button', { name: 'Confirm refund' }).click();
    await expect(dialog).toBeVisible();
    expect((await refunds()).data).toHaveLength(0);
    await dialog.getByLabel('Amount').fill('25.25');
    await dialog.getByLabel('Reason').fill('x');
    await dialog.getByRole('button', { name: 'Confirm refund' }).click();
    expect((await refunds()).data).toHaveLength(0);
    await dialog.getByLabel('Reason').fill('Partial refund verification');
    await page.route(
      '**/rest/v1/rpc/refund_payment',
      (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Temporary refund failure' }),
        }),
      { times: 1 },
    );
    await dialog.getByRole('button', { name: 'Confirm refund' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByLabel('Amount')).toHaveValue('25.25');
    expect((await refunds()).data).toHaveLength(0);
    // Commit once, lose the response, then allow the application's same-key retry.
    await page.route(
      '**/rest/v1/rpc/refund_payment',
      async (route) => {
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        await route.abort('failed');
      },
      { times: 1 },
    );
    await dialog.getByRole('button', { name: 'Confirm refund' }).click();
    await expect(dialog).toHaveCount(0);
    let records = await refunds();
    expect(records.error).toBeNull();
    expect(records.data).toHaveLength(1);
    expect(Number(records.data![0].amount)).toBe(25.25);
    await page.reload();
    await expect(page.getByRole('row').filter({ hasText: name })).toContainText(
      /partially refunded/i,
    );
    await row.getByRole('button', { name: 'Refund', exact: true }).click();
    await expect(dialog.getByLabel('Amount')).toHaveValue('75.25');
    await dialog.getByLabel('Reason').fill('Remaining refund verification');
    await dialog.getByRole('button', { name: 'Confirm refund' }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(row.getByRole('button', { name: 'Refunded', exact: true })).toBeDisabled();
    records = await refunds();
    expect(records.error).toBeNull();
    expect(records.data).toHaveLength(2);
    expect(records.data!.reduce((sum, r) => sum + Number(r.amount), 0)).toBe(100.5);
    const balance = await academy.admin
      .from('monthly_charge_balances')
      .select('paid_amount,balance_amount')
      .eq('id', charge.data!.id)
      .single();
    expect(balance.error).toBeNull();
    expect(Number(balance.data!.paid_amount)).toBe(0);
    expect(Number(balance.data!.balance_amount)).toBe(100.5);
    await page.goto('/fees');
    await page.getByLabel('Filter student name', { exact: true }).fill(name);
    await expect(page.getByRole('row').filter({ hasText: name })).toContainText('100.50');
    await page.getByRole('button', { name: `Pay ${name}`, exact: true }).click();
    await expect(page.getByRole('dialog').getByLabel('Amount')).toHaveValue('100.5');
  } finally {
    const removed = await cleanupClient
      .from('payment_refunds')
      .delete()
      .eq('payment_id', paymentId);
    expect(removed.error).toBeNull();
    const remaining = await refunds();
    expect(remaining.error).toBeNull();
    expect(remaining.data).toHaveLength(0);
  }
});

for (const role of ['receptionist', 'coach', 'parent'] as const) {
  test(`${role} cannot open refunds or execute a refund`, async ({ page, academy }) => {
    await login(page, `${role}@turf.local`);
    await page.goto('/payments/refunds');
    await expect(page).not.toHaveURL(/\/payments\/refunds/);
    await expect(page.getByRole('heading', { name: 'Refund actions' })).toHaveCount(0);
    const auth = await signIn(role);
    try {
      const result = await auth.client.rpc('refund_payment', {
        p_payment_id: academy.studentId,
        p_amount: 1,
        p_reason: 'Permission verification',
        p_client_reference: `denied-${role}-${academy.suffix}`,
      });
      expect(result.error?.code).toBe('42501');
    } finally {
      await auth.client.auth.signOut();
    }
  });
}
