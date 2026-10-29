import { expect, Page } from '@playwright/test';

export async function login(page: Page, identity = 'admin@turf.local'): Promise<void> {
  const configuredIdentity = process.env[`E2E_${identity.split('@')[0]!.toUpperCase()}_EMAIL`] ?? identity;
  const password = process.env['E2E_PASSWORD'] ?? 'academy123';
  await page.goto('/auth/login');
  await page.getByLabel('Email Address', { exact: true }).fill(configuredIdentity);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  const role = identity.split('@')[0];
  const dashboard = role === 'coach' ? '/coach/dashboard' : role === 'parent' ? '/parent/dashboard' : role === 'receptionist' ? '/dashboard/reception' : '/dashboard/admin';
  await expect(page, `Sign-in must reach the ${role} dashboard. Check the login error and E2E credentials if it fails.`).toHaveURL(new RegExp(`${dashboard}$`), { timeout: 30_000 });
}
