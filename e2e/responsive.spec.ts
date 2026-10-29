import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('critical screens fit supported viewport sizes', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  const viewports = [
    { width: 1920, height: 1080 }, { width: 1440, height: 900 },
    { width: 1366, height: 768 }, { width: 1024, height: 768 },
    { width: 768, height: 1024 }, { width: 430, height: 932 },
    { width: 390, height: 844 }, { width: 360, height: 800 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of ['/dashboard', '/students', '/fees/plans', '/fees']) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} overflows at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
    }
  }
});
