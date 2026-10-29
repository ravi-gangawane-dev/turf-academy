import { expect, test } from '@playwright/test';
import { login } from './helpers';

const roleRoutes = {
  admin: ['/dashboard/admin', '/students', '/parents', '/coaches', '/batches', '/enrollments', '/attendance', '/attendance/history', '/attendance/correction', '/fees/plans', '/fees', '/payments', '/notifications', '/reports', '/settings', '/students/add', '/parents/add', '/coaches/add', '/batches/student-allocation', '/batches/coach-assignment', '/batches/schedule', '/batches/capacity', '/enrollments/new', '/enrollments/transfer', '/enrollments/pause', '/enrollments/cancel', '/enrollments/fee-plans', '/enrollments/history', '/attendance/qr', '/attendance/manual-check-in', '/attendance/manual-check-out', '/attendance/calendar', '/attendance/offline-queue', '/fees/discounts', '/fees/late-fees', '/fees/pending', '/fees/summary', '/payments/new', '/payments/partial', '/payments/full', '/payments/receipts', '/payments/refunds', '/payments/history', '/notifications/whatsapp', '/notifications/templates', '/notifications/failed', '/notifications/delivery-status', '/reports/coach', '/reports/batch', '/settings/users'],
  receptionist: ['/dashboard/reception', '/students', '/parents', '/coaches', '/batches', '/enrollments', '/attendance', '/fees', '/payments', '/notifications'],
  coach: ['/coach/dashboard', '/coach/batches', '/coach/students', '/coach/attendance', '/coach/attendance/check-in-out', '/coach/attendance/correction', '/coach/attendance/history', '/coach/attendance/summary', '/coach/schedule', '/coach/notifications', '/coach/profile', '/coach/support'],
  parent: ['/parent/dashboard', '/parent/children', '/parent/attendance', '/parent/schedule', '/parent/fees', '/parent/payments', '/parent/notifications', '/parent/profile', '/parent/support', '/parent/attendance/calendar'],
};

for (const [role, routes] of Object.entries(roleRoutes)) {
  test(`${role} pages load with a consistent accessible shell on desktop and mobile`, async ({ page }) => {
    test.setTimeout(360_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await login(page, `${role}@turf.local`);
    for (const route of routes) {
      await test.step(route, async () => {
        await page.goto(route);
        await expect(page).toHaveURL(route);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByText(/Supabase is not configured|Unable to load|could not be loaded|Dashboard unavailable/i)).toHaveCount(0);
        await expect(page.locator('main .pi-spinner')).toHaveCount(0);
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 900 });
          await expect.configure({ soft: true }).poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), { timeout: 5000, message: `${route} at ${width}px` }).toBeLessThanOrEqual(1);
        }
      });
    }
    if (role === 'coach') {
      await page.goto('/coach/schedule');
      for (const mode of ['Day', 'Month', 'Week']) {
        await page.getByRole('button', { name: mode, exact: true }).click();
        await expect(page.locator('.schedule-controls')).not.toContainText('Invalid Date');
        await expect(page.locator('.week-calendar')).toBeVisible();
      }
    }
    expect(errors).toEqual([]);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });
}
