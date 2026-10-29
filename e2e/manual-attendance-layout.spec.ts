import { expect, test } from '@playwright/test';
import { login } from './helpers';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 390]) {
  test(`combined attendance workspace and manual workflow at ${width}px`, async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/attendance/check-in-out');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Student Check In / Check Out');
    await expect(page.getByRole('button', { name: 'Mark Check In', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Mark Check Out', exact: true })).toBeDisabled();
    const choice = page.locator('#manual-in .student-choice').first();
    const name = await choice.locator('strong').innerText();
    await choice.locator('small').evaluate(node => node.textContent = 'B7155455-4E9A-49FD-8659-061E46CC0044');
    expect(await choice.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await choice.getByRole('checkbox').check();
    await expect(choice).toHaveClass(/selected/);
    await page.getByRole('button', { name: 'Mark Check In', exact: true }).click();
    await expect(page.locator('.manual-notice')).toContainText('1 student checked in successfully.');
    const inside = page.locator('#manual-out .student-choice').filter({ hasText: name });
    await expect(inside).toBeVisible();
    await inside.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Mark Check Out', exact: true }).click();
    await expect(page.locator('.manual-notice')).toContainText('1 student checked out successfully.');
    await expect(inside).toHaveCount(0);
    await expect(page.locator('.activity-card')).toContainText(name);
    await expect(page.locator('.activity-card')).toContainText('Check out');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'Manual Check In', exact: true }).click();
    await expect(page.locator('#manual-in')).toBeFocused();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `test-results/combined-attendance-${width}.png`, fullPage: true });
    await page.reload();
    await expect(page.locator('#manual-out .student-choice').filter({ hasText: name })).toHaveCount(0);
    if (width === 1440) {
      const results = await new AxeBuilder({ page }).include('.attendance-workspace').analyze();
      expect(results.violations).toEqual([]);
    }
  });
}

test('all legacy attendance entry URLs open the combined workspace', async ({ page }) => {
  await login(page);
  for (const route of ['manual-check-in', 'manual-check-out', 'qr']) {
    await page.goto(`/attendance/${route}`);
    await expect(page).toHaveURL(/attendance\/check-in-out$/);
    await expect(page.locator('#scanner')).toBeVisible();
    await expect(page.locator('#manual-in')).toBeVisible();
    await expect(page.locator('#manual-out')).toBeVisible();
  }
});

test('bulk check-in and search selection reset', async ({ page }) => {
  await login(page);
  await page.goto('/attendance/check-in-out');
  const choices = page.locator('#manual-in .student-choice input');
  await choices.nth(0).check();
  await choices.nth(1).check();
  await expect(page.locator('#manual-in .selection-hint')).toContainText('2 selected');
  await page.getByRole('searchbox', { name: 'Search students', exact: true }).fill('no matching student');
  await expect(page.locator('#manual-in .student-choice')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mark Check In', exact: true })).toBeDisabled();
  await page.getByRole('searchbox', { name: 'Search students', exact: true }).fill('');
  await choices.nth(0).check();
  await choices.nth(1).check();
  await page.getByRole('button', { name: 'Mark Check In', exact: true }).click();
  await expect(page.locator('.manual-notice')).toContainText('2 students checked in successfully.');
});
