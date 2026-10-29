import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('unauthenticated staff routes redirect to login', async ({ page }) => {
  await page.goto('/fees');
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('heading', { name: 'Login to Turf Cricket Academy' })).toBeVisible();
});

test('coach navigation and direct routes follow permissions', async ({ page }) => {
  await login(page, 'coach@turf.local');
  await expect(page.locator('a[href="/coach/attendance"]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Fees' })).toHaveCount(0);
  await page.goto('/fees');
  await expect(page).toHaveURL(/\/unauthorized$/);
  await expect(page.getByRole('heading', { name: 'Your role cannot open this area' })).toBeVisible();
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/unauthorized$/);
  await page.goto('/design/foundations/colors');
  await expect(page).toHaveURL(/\/unauthorized$/);
});

test('coach Attendance stays a single aligned sidebar item while quick actions retain routes', async ({ page }) => {
  await login(page, 'coach@turf.local');
  await page.goto('/coach/attendance');
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation.locator('a[href="/coach/attendance"]')).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Today', exact: true })).toHaveCount(0);
  await expect(navigation.getByRole('link', { name: 'Check In / Out', exact: true })).toHaveCount(0);
  const attendanceOptions = navigation.getByRole('button', { name: 'Attendance options' });
  await expect(attendanceOptions).toHaveAttribute('aria-expanded', 'false');
  await attendanceOptions.click();
  await expect(attendanceOptions).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', { name: 'Check In / Out', exact: true })).toBeVisible();
  await navigation.getByRole('link', { name: 'Check In / Out', exact: true }).click();
  await expect(page).toHaveURL(/\/coach\/attendance\/check-in-out$/);
});

test('parent can access linked-child pages but not staff or internal pages', async ({ page }) => {
  await login(page, 'parent@turf.local');
  await page.goto('/parent/children');
  await expect(page).toHaveURL(/\/parent\/children$/);
  await page.goto('/students');
  await expect(page).toHaveURL(/\/unauthorized$/);
  await page.goto('/coach/dashboard');
  await expect(page).toHaveURL(/\/unauthorized$/);
  await page.goto('/handoff/components');
  await expect(page).toHaveURL(/\/unauthorized$/);
});

test('session survives reload and logout clears protected access', async ({ page }) => {
  await login(page, 'admin@turf.local');
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard\/admin$/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
  await page.goto('/dashboard/admin');
  await expect(page).toHaveURL(/\/auth\/login/);
});
