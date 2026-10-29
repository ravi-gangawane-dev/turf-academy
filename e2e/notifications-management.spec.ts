import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { login } from './helpers';

// Mock-app browser acceptance: navigation, keyboard controls, error-state layout.
// SQL scope/selector data are covered by DB and component suites, not live Supabase here.
for (const width of [1440, 390]) {
  test(`notification navigation and filters at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    await page.goto('/notifications/failed?channel=email&batchId=unlinked');
    await expect(page).toHaveURL(/\/notifications\?.*status=failed/);
    await expect(page.locator('app-page-hero + app-notification-section-nav')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'batches', exact: true })).toHaveValue(
      'unlinked',
    );
    await page.getByRole('combobox', { name: 'Channel', exact: true }).selectOption('whatsapp');
    await expect(page).toHaveURL(/channel=whatsapp/);
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Channel', exact: true })).toHaveValue(
      'whatsapp',
    );
    await page.getByRole('searchbox', { name: 'Find students', exact: true }).fill('Aarav');
    await page.getByRole('button', { name: 'Clear all filters', exact: true }).click();
    await expect(page.getByRole('searchbox', { name: 'Find students', exact: true })).toHaveValue('');
    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page.getByRole('combobox', { name: 'batches', exact: true })).toHaveValue('');
    await page.goBack();
    await expect(page.getByRole('combobox', { name: 'batches', exact: true })).toHaveValue(
      'unlinked',
    );
    const search = page.getByRole('searchbox', { name: 'Find students', exact: true });
    await search.focus();
    await expect(search).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox', { name: 'students', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    const results = await new AxeBuilder({ page }).include('app-notifications-page').analyze();
    expect(
      results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? '')),
    ).toEqual([]);
  });
}

test('receptionist sees Management and Events without template administration', async ({
  page,
}) => {
  await login(page, 'receptionist@turf.local');
  await page.goto('/notifications/delivery-status');
  const nav = page.locator('app-notification-section-nav');
  await expect(nav.getByRole('link', { name: 'Management', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(nav.getByRole('link', { name: 'Events & Holidays', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Templates', exact: true })).toHaveCount(0);
});
