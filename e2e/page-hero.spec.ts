import { expect, test } from '@playwright/test';
import { login } from './helpers';

for (const width of [1440, 390]) {
  test(`shared page headers and controls at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/dashboard', '/students', '/coaches', '/parents', '/batches',
      '/enrollments', '/attendance', '/attendance/manual-check-in',
      '/attendance/history', '/attendance/calendar', '/attendance/offline-queue',
      '/fees', '/fees/plans', '/fees/discounts', '/payments', '/reports',
      '/notifications', '/notifications/templates', '/settings', '/settings/users',
      '/settings/audit-logs', '/settings/permissions',
    ]) {
      await page.goto(route);
      const hero = page.locator('app-page-hero');
      await expect(hero, route).toBeVisible();
      await expect(page.locator('h1'), route).toHaveCount(1);
      const bounds = await hero.locator('header').boundingBox();
      expect(bounds!.x, route).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width, route).toBeLessThanOrEqual(width + 1);
      await expect(hero.locator('[aria-current="page"] button')).toHaveCount(0);
    }
    await page.goto('/fees/plans');
    await page.getByRole('button', { name: 'Add Fee Plan', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto('/enrollments');
    await page.locator('app-page-hero').getByRole('link', { name: 'New Enrollment' }).click();
    await expect(page).toHaveURL(/\/enrollments\/new$/);
    await page.goto('/attendance/manual-check-in');
    await page.getByRole('searchbox', { name: 'Search students', exact: true }).fill('No matching student');
    await expect(page.locator('#manual-in .student-choice')).toHaveCount(0);
    await page.getByRole('searchbox', { name: 'Search students', exact: true }).fill('');
    await expect(page.locator('#manual-in .student-choice').first()).toBeVisible();
    await page.screenshot({ path: `test-results/page-hero-${width}.png`, fullPage: false });
  });
}
