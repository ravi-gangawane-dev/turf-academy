import { expect, test, Page } from '@playwright/test';
import { login } from './helpers';

async function checkAuthLayout(page: Page) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('form.login-card')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('form.login-card').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    for (const input of await page.locator('form input:not([type="checkbox"])').all()) {
      const bounds = await input.boundingBox();
      expect(bounds?.width).toBeGreaterThan(120);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
    }
    const action = page.locator('form .login-button');
    await action.scrollIntoViewIfNeeded();
    await expect(action).toBeInViewport();
  }
}

for (const route of ['login', 'forgot-password', 'reset-password', 'otp', 'session-expired', 'password-updated']) {
  test(`auth/${route} remains usable at desktop, tablet, phone and landscape sizes`, async ({ page }) => {
    await page.goto(`/auth/${route}`);
    await checkAuthLayout(page);
  });
}

test('change-password remains usable inside the authenticated shell', async ({ page }) => {
  await login(page);
  await page.goto('/auth/change-password');
  await checkAuthLayout(page);
  await page.getByLabel('New password', { exact: true }).fill('NewPassword123!');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('New password', { exact: true })).toHaveAttribute('type', 'text');
});

test('recovery errors and return links remain reachable on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/auth/reset-password?error=access_denied');
  await expect(page.getByRole('alert')).toContainText('invalid or has expired');
  const recovery = page.getByRole('link', { name: 'Request a new reset link' });
  await recovery.click();
  await expect(page).toHaveURL(/\/auth\/forgot-password$/);
  await page.getByRole('button', { name: 'Send recovery email' }).click();
  await expect(page.getByRole('alert')).toContainText('valid email');
  await page.getByRole('link', { name: 'Back to login' }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
});

test('splash still redirects to login', async ({ page }) => {
  await page.goto('/auth/splash');
  await expect(page).toHaveURL(/\/auth\/login$/);
});
