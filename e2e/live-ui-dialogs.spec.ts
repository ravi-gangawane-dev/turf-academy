import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('dialogs retain keyboard focus, close with Escape and restore the trigger on mobile', async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings/users');
  const trigger = page.getByRole('button', { name: 'Invite User' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Invite academy user' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Full name')).toBeFocused();
  await dialog.getByRole('button', { name: 'Close', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  expect(await dialog.evaluate((node) => { const box = node.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.height <= innerHeight; })).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.goto('/batches');
  const remove = page.getByRole('button', { name: 'Delete', exact: true }).first();
  await remove.click();
  const confirmation = page.getByRole('dialog', { name: 'Delete batch', exact: true });
  await expect(confirmation).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(confirmation).toHaveCount(0);
  await expect(remove).toBeFocused();
});
