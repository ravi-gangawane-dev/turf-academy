import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { signIn, test } from './live-fixtures';
import { login } from './helpers';

test.use({ actionTimeout: 15_000 });

for (const role of ['admin', 'receptionist'] as const) {
  test(`${role} persists enrollment, charges, payments and history through the UI`, async ({
    page,
    academy,
  }) => {
    test.setTimeout(240_000);
    const today = new Date().toISOString().slice(0, 10);
    const name = `E2E Workflow ${role} ${academy.suffix}`;
    academy.trackStudentName(name);
    const student = await academy.admin
      .from('students')
      .insert({
        student_code: `WF-${role}-${academy.suffix}`,
        full_name: name,
        date_of_birth: '2014-04-12',
      })
      .select('id')
      .single();
    expect(student.error).toBeNull();
    const studentId = student.data!.id;
    try {
      await login(page, `${role}@turf.local`);
      await page.goto('/enrollments/new');
      await page.getByLabel('Student *').selectOption(studentId);
      await page.getByLabel('Batch *').selectOption(academy.batchId);
      await expect(page.getByLabel('Fee plan *')).toHaveValue(academy.planId);
      await page.getByLabel('Start date').fill(today);
      await page.getByLabel('Notes', { exact: true }).fill('Persisted enrollment note');
      await page.route(
        '**/rest/v1/rpc/create_enrollment',
        (route) =>
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Enrollment save temporarily unavailable' }),
          }),
        { times: 1 },
      );
      await page.getByRole('button', { name: 'Create enrollment', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText(
        'This request could not be completed. Please try again.',
      );
      await expect(page.getByLabel('Notes', { exact: true })).toHaveValue(
        'Persisted enrollment note',
      );
      await page.getByRole('button', { name: 'Create enrollment', exact: true }).click();
      await expect(page).toHaveURL(/\/enrollments$/);
      const enrollment = await academy.admin
        .from('enrollments')
        .select('*')
        .eq('student_id', studentId)
        .single();
      expect(enrollment.error).toBeNull();
      expect(enrollment.data).toMatchObject({
        batch_id: academy.batchId,
        fee_plan_id: academy.planId,
        notes: 'Persisted enrollment note',
        status: 'active',
      });
      const enrollmentId = enrollment.data!.id;
      await page.reload();
      await page.getByLabel('Filter student', { exact: true }).fill(name);
      await expect(page.getByRole('row').filter({ hasText: name })).toContainText('active');

      await page.goto('/enrollments/fee-plans');
      await page.getByLabel('Filter plan name', { exact: true }).fill(`E2E Plan ${academy.suffix}`);
      await expect(
        page.getByRole('row').filter({ hasText: `E2E Plan ${academy.suffix}` }),
      ).toBeVisible();
      await page.goto('/fees');
      await page.getByRole('button', { name: 'Add Monthly Charge' }).click();
      let dialog = page.getByRole('dialog');
      await dialog.getByLabel('Student enrollment').selectOption(enrollmentId);
      await expect(dialog.getByLabel('Monthly charge')).toHaveValue('1000');
      await dialog.getByLabel('Month', { exact: true }).fill(today.slice(0, 7));
      await dialog.getByLabel('Due date').fill(today);
      await dialog.getByLabel('Monthly charge').fill('1250.50');
      await dialog.getByRole('button', { name: 'Add Charge', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      const charge = await academy.admin
        .from('monthly_charges')
        .select('id,base_amount')
        .eq('enrollment_id', enrollmentId)
        .single();
      expect(charge.error).toBeNull();
      expect(Number(charge.data!.base_amount)).toBe(1250.5);
      await page.reload();
      await page.getByLabel('Filter student name', { exact: true }).fill(name);
      await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible();
      await page.getByRole('button', { name: `Pay ${name}`, exact: true }).click();
      dialog = page.getByRole('dialog');
      await dialog.getByLabel('Amount').fill('250.25');
      await dialog.getByLabel('Payment mode').selectOption('cash');
      // Commit the write but lose its HTTP response. The retry reference must
      // recover this exact payment without charging the student twice.
      await page.route(
        '**/rest/v1/rpc/record_payment',
        async (route) => {
          await route.fetch();
          await route.abort('failed');
        },
        { times: 1 },
      );
      await dialog.getByRole('button', { name: 'Save payment' }).click();
      await expect(dialog).toHaveCount(0);
      let balance = await academy.admin
        .from('monthly_charge_balances')
        .select('paid_amount,balance_amount')
        .eq('id', charge.data!.id)
        .single();
      expect(balance.error).toBeNull();
      expect(Number(balance.data!.paid_amount)).toBe(250.25);
      expect(Number(balance.data!.balance_amount)).toBe(1000.25);
      const payments = await academy.admin
        .from('payments')
        .select('id')
        .eq('monthly_charge_id', charge.data!.id);
      expect(payments.error).toBeNull();
      expect(payments.data).toHaveLength(1);
      await page.reload();
      await page.getByLabel('Filter student name', { exact: true }).fill(name);
      await page.getByRole('button', { name: `Pay ${name}`, exact: true }).click();
      dialog = page.getByRole('dialog');
      await dialog.getByLabel('Amount').fill('9999');
      await dialog.getByRole('button', { name: 'Save payment' }).click();
      await expect(dialog.getByRole('alert')).toContainText('Enter a positive payment amount no greater than the outstanding balance.');
      await dialog.getByLabel('Amount').fill('1000.25');
      await dialog.getByRole('button', { name: 'Save payment' }).click();
      await expect(dialog).toHaveCount(0);
      balance = await academy.admin
        .from('monthly_charge_balances')
        .select('paid_amount,balance_amount')
        .eq('id', charge.data!.id)
        .single();
      expect(Number(balance.data!.balance_amount)).toBe(0);
      await page.reload();
      await page.getByLabel('Filter student name', { exact: true }).fill(name);
      await expect(page.getByRole('button', { name: `Pay ${name}`, exact: true })).toBeDisabled();

      for (const action of ['pause', 'transfer', 'cancel']) {
        await page.goto(`/enrollments/${action}?enrollment=${enrollmentId}`);
        await expect(page.getByLabel('Enrollment *')).toHaveValue(enrollmentId);
        await page.getByLabel('Reason *').fill(`Workflow ${action} reason`);
        if (action === 'transfer')
          await page.getByLabel('Destination batch').selectOption(academy.otherBatchId);
        await page
          .getByRole('button', {
            name:
              action === 'pause'
                ? 'Pause Enrollment'
                : action === 'transfer'
                  ? 'Transfer Batch'
                  : 'Cancel Enrollment',
            exact: true,
          })
          .click();
        await expect(page).toHaveURL(/\/enrollments$/);
        await page.reload();
        await page.getByLabel('Filter student', { exact: true }).fill(name);
        const row = page.getByRole('row').filter({ hasText: name });
        if (action === 'pause') {
          await expect(row).toContainText('paused');
          await row.getByRole('button', { name: 'Reactivate' }).click();
          await expect(row).toContainText('active');
        } else if (action === 'transfer')
          await expect(row).toContainText(`E2E Unassigned ${academy.suffix}`);
        else await expect(row).toContainText('cancelled');
      }
      const events = await academy.admin
        .from('enrollment_history')
        .select('*')
        .eq('enrollment_id', enrollmentId);
      expect(events.error).toBeNull();
      expect(events.data).toHaveLength(5);
      const extra = Array.from({ length: 16 }, (_, i) => ({
        enrollment_id: enrollmentId,
        event_type: 'status_changed',
        previous_status: 'active',
        new_status: 'paused',
        effective_on: today,
        reason: `Pagination fixture ${i}`,
        changed_by: events.data![0]!.changed_by,
      }));
      expect((await academy.admin.from('enrollment_history').insert(extra)).error).toBeNull();
      await page.goto('/enrollments/history');
      await page.getByLabel('Filter student', { exact: true }).fill(name);
      await page.getByLabel('Rows per page').selectOption('20');
      await expect(page.getByText('21 matching activities')).toBeVisible();
      await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(20);
      await page.getByRole('button', { name: 'Next page' }).click();
      await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(1);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export history' }).click();
      const download = await downloadPromise;
      const csv = await readFile((await download.path())!, 'utf8');
      expect(csv.split('\r\n')).toHaveLength(22);
      expect(csv).toContain('Persisted enrollment note');
      expect(csv).toContain('Workflow transfer reason');
      await page.getByLabel('Filter action', { exact: true }).fill('created');
      await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(1);
      await page.getByLabel('Filter student', { exact: true }).fill('No matching student');
      await expect(page.getByText('0 matching activities')).toBeVisible();
      for (const route of [
        '/enrollments',
        '/enrollments/new',
        '/enrollments/transfer',
        '/enrollments/history',
        '/enrollments/fee-plans',
        '/fees',
      ]) {
        await page.goto(route);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        await expect
          .poll(
            () =>
              page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
              ),
            { message: route },
          )
          .toBeLessThanOrEqual(1);
      }
    } finally {
      expect(
        (await academy.admin.rpc('delete_student_profile', { p_student_id: studentId })).error,
      ).toBeNull();
    }
  });
}

for (const role of ['coach', 'parent'] as const) {
  test(`${role} cannot mutate enrollment or financial workflows`, async ({ page, academy }) => {
    const { client } = await signIn(role);
    try {
      const enrolled = await academy.admin
        .from('enrollments')
        .select('id')
        .eq('student_id', academy.studentId)
        .single();
      expect(enrolled.error).toBeNull();
      const id = enrolled.data!.id;
      const create = await client.rpc('create_enrollment', {
        p_student_id: academy.studentId,
        p_batch_id: academy.batchId,
        p_fee_plan_id: academy.planId,
        p_valid_from: new Date().toISOString().slice(0, 10),
      });
      expect(create.error).not.toBeNull();
      for (const status of ['paused', 'cancelled', 'active'])
        expect(
          (
            await client.rpc('change_enrollment_status', {
              p_enrollment_id: id,
              p_status: status,
              p_reason: 'Unauthorized attempt',
            })
          ).error,
        ).not.toBeNull();
      expect(
        (
          await client.rpc('transfer_enrollment', {
            p_enrollment_id: id,
            p_batch_id: academy.otherBatchId,
            p_effective_on: new Date().toISOString().slice(0, 10),
          })
        ).error,
      ).not.toBeNull();
      expect(
        (
          await client
            .from('monthly_charges')
            .insert({
              enrollment_id: id,
              student_id: academy.studentId,
              charge_month: '2026-09-01',
              due_date: '2026-09-25',
              base_amount: 10,
            })
        ).error,
      ).not.toBeNull();
      expect(
        (
          await client.rpc('record_payment', {
            p_charge_id: crypto.randomUUID(),
            p_amount: 10,
            p_mode: 'cash',
            p_client_reference: crypto.randomUUID(),
          })
        ).error,
      ).not.toBeNull();
      const unchanged = await academy.admin
        .from('enrollments')
        .select('status,batch_id')
        .eq('id', id)
        .single();
      expect(unchanged.data).toMatchObject({ status: 'active', batch_id: academy.batchId });
      await login(page, `${role}@turf.local`);
      for (const route of [
        '/enrollments',
        '/enrollments/new',
        '/enrollments/history',
        '/enrollments/fee-plans',
        '/fees',
      ]) {
        await page.goto(route);
        await expect(page).toHaveURL(/\/unauthorized$/);
      }
    } finally {
      await client.auth.signOut();
    }
  });
}
