import { expect, test } from '@playwright/test';
import { login } from './helpers';
for (const width of [1440, 390]) {
  test('all batch tabs at ' + width + 'px', async ({ page }) => {
    test.setTimeout(120000);
    await login(page);
    await page.setViewportSize({ width, height: 1000 });
    for (const tab of ['', '/coach-assignment', '/student-allocation', '/schedule', '/capacity']) {
      await page.goto('/batches' + tab);
      await expect(page.locator('.batch-tabs [aria-current="page"]')).toHaveCount(1);
      await expect(page.locator('.column-filters').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      for (const button of await page.locator('.action-fields > button').all()) {
        const bounds = await button.boundingBox();
        expect(bounds!.height).toBe(44);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      }
      const filter = page.locator('.column-filters input[type="search"]').first();
      await filter.fill('No matching record');
      await page.getByRole('button', { name: /Reset/ }).first().click();
      await expect(filter).toHaveValue('');
      if (tab === '/student-allocation')
        await expect(
          page.getByRole('searchbox', { name: 'Filter status', exact: true }),
        ).toBeVisible();
      await page.screenshot({
        path: 'test-results/batch-tab-' + (tab.slice(1) || 'list') + '-' + width + '.png',
        fullPage: true,
      });
    }
  });
}
