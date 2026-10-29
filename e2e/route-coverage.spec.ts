import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('account recovery routes are available', async ({ page }) => {
  for (const route of ['/auth/forgot-password', '/auth/reset-password', '/auth/otp', '/auth/session-expired']) {
    await page.goto(route);
    await expect(page.getByRole('heading').first()).toBeVisible();
  }
});

test('new academy module routes are protected and render', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  const routes = [
    '/fees/discounts', '/fees/late-fees', '/fees/pending', '/fees/summary',
    '/payments', '/payments/new', '/payments/partial', '/payments/full',
    '/payments/receipts', '/payments/refunds', '/payments/history',
    '/notifications/whatsapp', '/notifications/templates',
    '/notifications/failed', '/notifications/delivery-status',
    '/reports/coach', '/reports/batch', '/settings', '/settings/users',
    '/settings/roles', '/settings/permissions', '/settings/notifications',
    '/settings/theme', '/settings/audit-logs', '/settings/backup',
    '/design/foundations/tokens', '/design/components/buttons', '/handoff/specifications',
  ];
  for (const route of routes) {
    await test.step(route, async () => {
      await page.goto(route);
      await expect(page).toHaveURL(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
});
