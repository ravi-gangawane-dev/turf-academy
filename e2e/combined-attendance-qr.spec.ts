import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('QR confirmation checks in, checks out, and prevents a repeated checkout', async ({ page }) => {
  await login(page);
  await page.goto('/attendance/check-in-out');
  await page.getByLabel('Student QR code', { exact: true }).fill('TCA:qa-camera-student');
  await page.getByRole('button', { name: 'Identify student', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm check in', exact: true }).click();
  await expect(page.locator('.manual-notice')).toContainText('QA Camera Test Student checked in.');
  await expect(page.locator('#manual-out')).toContainText('QA Camera Test Student');
  await page.getByRole('button', { name: 'Identify student', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm check out', exact: true }).click();
  await expect(page.locator('.manual-notice')).toContainText('QA Camera Test Student checked out.');
  await expect(page.locator('#manual-out .student-choice').filter({ hasText: 'QA Camera Test Student' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Identify student', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Already checked out', exact: true })).toBeDisabled();
  for (const width of [320, 768, 1280, 1536]) {
    await page.setViewportSize({ width, height: 1024 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}px`).toBeLessThanOrEqual(1);
  }
});
