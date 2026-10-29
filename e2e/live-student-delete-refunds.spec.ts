import { expect } from '@playwright/test';
import { test } from './live-fixtures';
import { login } from './helpers';

for (const refundAmount of [25, 100]) {
  test(`admin deletes a student with ${refundAmount === 100 ? 'full' : 'partial'} refund history and retains audit evidence`, async ({
    page,
    academy,
  }) => {
    const name = `Delete refund ${academy.suffix}`;
    academy.trackStudentName(name);
    const student = await academy.admin
      .from('students')
      .insert({
        student_code: `DEL-${academy.suffix}`,
        full_name: name,
        date_of_birth: '2014-04-12',
      })
      .select('id')
      .single();
    expect(student.error).toBeNull();
    const studentId = student.data!.id;
    const enrollment = await academy.admin
      .from('enrollments')
      .insert({
        student_id: studentId,
        batch_id: academy.batchId,
        fee_plan_id: academy.planId,
        valid_from: '1899-01-01',
        monthly_fee: 100,
      })
      .select('id')
      .single();
    expect(enrollment.error).toBeNull();
    const charge = await academy.admin
      .from('monthly_charges')
      .insert({
        student_id: studentId,
        enrollment_id: enrollment.data!.id,
        charge_month: '1899-01-01',
        due_date: '1899-01-10',
        base_amount: 100,
      })
      .select('id')
      .single();
    expect(charge.error).toBeNull();
    const payment = await academy.admin.rpc('record_payment', {
      p_charge_id: charge.data!.id,
      p_amount: 100,
      p_mode: 'cash',
      p_client_reference: `delete-${academy.suffix}`,
    });
    expect(payment.error).toBeNull();
    const paymentId = payment.data.payment.id;
    const refund = await academy.admin.rpc('refund_payment', {
      p_payment_id: paymentId,
      p_amount: refundAmount,
      p_reason: 'Student deletion regression',
      p_client_reference: `delete-refund-${academy.suffix}`,
    });
    expect(refund.error).toBeNull();
    await login(page);
    await page.goto('/students');
    await page.getByLabel('Filter student', { exact: true }).fill(name);
    const row = page.getByRole('row').filter({ hasText: name });
    await row.getByRole('button', { name: 'Delete student', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('.student-action-notice').filter({ hasText: 'Student deleted successfully.' })).toBeVisible();
    await page.reload();
    await page.getByLabel('Filter student', { exact: true }).fill(name);
    await expect(row).toHaveCount(0);
    for (const [table, column, id] of [
      ['students', 'id', studentId],
      ['payments', 'id', paymentId],
      ['payment_refunds', 'payment_id', paymentId],
      ['monthly_charges', 'id', charge.data!.id],
    ] as const) {
      const result = await academy.admin.from(table).select('id').eq(column, id);
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(0);
    }
    const audit = await academy.admin
      .from('audit_logs')
      .select('old_values')
      .eq('table_name', 'payment_refunds')
      .eq('record_id', refund.data.id)
      .eq('action', 'DELETE');
    expect(audit.error).toBeNull();
    expect(audit.data).toHaveLength(1);
    expect(audit.data![0].old_values).toMatchObject({
      payment_id: paymentId,
      amount: refundAmount,
      reason: 'Student deletion regression',
    });
    expect(
      (await academy.admin.from('students').select('id').eq('id', academy.studentId).single())
        .error,
    ).toBeNull();
  });
}
