import { expect, test } from '@playwright/test';
import { login } from './helpers';
import { signIn } from './live-fixtures';

test('admin can create, search, edit and delete a fee plan', async ({ page }) => {
  const planName = `E2E Skills Camp ${crypto.randomUUID().slice(0, 8)}`;
  const { client: admin } = await signIn('admin');
  try {
    await login(page);
    await page.goto('/fees/plans');
    await expect(page.getByRole('heading', { name: 'Fee Plans', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Add Fee Plan' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Plan name').fill(planName);
    await dialog.getByLabel('Description').fill('Focused skills development');
    await dialog.getByLabel('Duration (months)').fill('2');
    await dialog.getByLabel('Monthly fee').fill('1800');
    await dialog.getByRole('button', { name: 'Save Fee Plan' }).click();
    await expect(dialog).toBeHidden();
    await page.getByLabel('Search fee plans').fill(planName);
    const row = page.getByRole('row').filter({ hasText: planName });
    await expect(row).toContainText('3,600');
    await page.reload();
    await page.getByLabel('Search fee plans').fill(planName);
    await expect(row).toContainText('3,600');
    await row.getByRole('button', { name: `Edit ${planName}`, exact: true }).click();
    await dialog.getByLabel('Monthly fee').fill('2000');
    await dialog.getByRole('button', { name: 'Save Fee Plan' }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toContainText('4,000');
    await row.getByRole('button', { name: `Delete ${planName}`, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(row).toHaveCount(0);
    const removed = await admin.from('fee_plans').select('id').eq('name', planName);
    expect(removed.error).toBeNull();
    expect(removed.data).toEqual([]);
  } finally {
    expect((await admin.from('fee_plans').delete().eq('name', planName)).error).toBeNull();
    await admin.auth.signOut();
  }
});
