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
  await expect(page.locator('.manual-notice')).toBeVisible();
  await page.goto('/attendance/history');
  await expect(page.locator('tbody')).toContainText(name);
  await page
    .getByRole('combobox', { name: 'Attendance Status', exact: true })
    .selectOption('absent');
  await expect(page.getByText('No attendance records match these filters.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Attendance Status', exact: true }).selectOption('all');
  await expect(page.locator('tbody')).toContainText(name);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export current page CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/attendance-history.*csv/);
  await page.goto('/attendance/calendar');
  const month = page.locator('input[type="month"]');
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
