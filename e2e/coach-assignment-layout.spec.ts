import { expect, test } from '@playwright/test';
import { login } from './helpers';
for (const width of [1440, 390]) {
  test('coach assignment controls at ' + width + 'px', async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/batches/coach-assignment');
    const form = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: 'Assign coach', exact: true }) });
    await expect(form).toBeVisible();
    const button = form.getByRole('button', { name: 'Assign coach', exact: true });
    const bounds = await button.boundingBox();
    expect(bounds!.height).toBe(44);
    const select = await form.getByRole('combobox', { name: 'Role', exact: true }).boundingBox();
    if (width === 1440) expect(Math.abs(bounds!.y - select!.y)).toBeLessThanOrEqual(1);
    const input = page.getByRole('searchbox', { name: 'Filter coach', exact: true }).first();
    await input.fill('No matching coach');
    await expect(input).toHaveValue('No matching coach');
    await page.getByRole('button', { name: /Reset/ }).first().click();
    await expect(input).toHaveValue('');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
    await page.screenshot({
      path: 'test-results/coach-assignment-' + width + '.png',
      fullPage: true,
    });
  });
}
