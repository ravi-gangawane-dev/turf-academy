import { expect, test } from '@playwright/test';
import { login } from './helpers';

// Control/layout checks; live directory query behavior requires Supabase verification.
for (const width of [1440, 390]) {
  test(`column filters remain usable at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    page.setDefaultTimeout(10_000);
    await login(page);
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/students',
      '/parents',
      '/coaches',
      '/batches',
      '/fees',
      '/fees/plans',
      '/notifications',
      '/settings/audit-logs',
    ]) {
      await page.goto(route);
      const filter = page.locator('.column-filters input[type="search"]').first();
      await expect(filter, route).toBeVisible();
      await filter.fill('No matching record');
      await expect(filter).toHaveValue('No matching record');
      await page.getByRole('button', { name: /reset/i }).first().click();
      await expect(filter).toHaveValue('');
      const sort = page.locator('app-sortable-header button').first();
      await sort.click();
      await expect(sort).toHaveAttribute('aria-pressed', 'true');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        route,
      ).toBe(true);
      for (const input of await page.locator('.column-filters input').all()) {
        await input.scrollIntoViewIfNeeded();
        await expect(input).toBeInViewport();
      }
    }
  });
}
