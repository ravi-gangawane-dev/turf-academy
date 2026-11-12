import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('mock attendance can be reviewed, filtered and exported in history and calendar', async ({
  page,
}) => {
  await login(page);
  await page.goto('/attendance/manual-check-in');
  const choice = page.locator('#manual-in .student-choice').first();
  const name = await choice.locator('strong').innerText();
  await choice.click();
  await page.getByRole('button', { name: 'Mark Check In' }).click();
  await expect(page.getByRole('region', { name: 'Notifications', exact: true })).toContainText('1 student checked in successfully.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('region', { name: 'Notifications', exact: true }).getByRole('button', { name: 'Dismiss', exact: true }).first().click();
  await expect(page.getByRole('region', { name: 'Notifications', exact: true }).getByRole('article')).toHaveCount(0);
  // Mock records live in memory; use the application's navigation to retain them.
  await page.getByRole('link', { name: 'View Attendance', exact: true }).click();
  await expect(page.locator('tbody')).toContainText(name);
  await page
    .getByRole('combobox', { name: 'Attendance Status', exact: true })
    .selectOption('absent');
  await expect(page.getByText('No attendance records match these filters.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Attendance Status', exact: true }).selectOption('all');
  await expect(page.locator('tbody')).toContainText(name);
  await page.getByRole('button', { name: 'Export records', exact: true }).click();
  await page.getByRole('radio', { name: /Current page/ }).check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/attendance-history.*csv/);
  await page.getByRole('link', { name: 'Calendar View', exact: true }).click();
  const month = page.locator('input[type="month"]');
  await expect(month).toHaveValue(/^\d{4}-\d{2}$/);
  const initial = await month.inputValue();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(month).not.toHaveValue(initial);
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await expect(month).toHaveValue(initial);
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('tbody')).toContainText(name);
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('absent');
  await expect(page.getByText('No Records Found', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('');
  await expect(page.locator('tbody')).toContainText(name);
});
