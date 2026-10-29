import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { login } from './helpers';

test('admin settings show permissions, persist appearance, and export academy records', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page);
  await page.goto('/settings/permissions');
  await expect(page.getByRole('heading', { name: 'Role Permissions' })).toBeVisible();
  await expect(
    page
      .getByRole('row')
      .filter({ has: page.getByRole('rowheader', { name: 'admin', exact: true }) }),
  ).toContainText('settings:write');
  await expect(
    page
      .getByRole('row')
      .filter({ has: page.getByRole('rowheader', { name: 'receptionist', exact: true }) }),
  ).not.toContainText('settings:write');

  await page.goto('/settings/theme');
  await page.getByRole('button', { name: 'Blue', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Blue', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('html')).toHaveAttribute('data-academy-theme', 'blue');
  await page.getByRole('button', { name: 'Forest', exact: true }).click();

  await page.goto('/settings/backup');
  await page.route(
    '**/rest/v1/students?*',
    (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Export request rejected' }),
      }),
    { times: 1 },
  );
  await page.getByRole('button', { name: 'Download academy data' }).click();
  await expect(page.getByRole('alert')).toContainText('Export request rejected');
  await expect(page.getByRole('button', { name: 'Download academy data' })).toBeEnabled();

  const downloading = page.waitForEvent('download', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Download academy data' }).click();
  const download = await downloading;
  try {
    expect(download.suggestedFilename()).toMatch(/^academy-records-\d{4}-\d{2}-\d{2}\.json$/);
    const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
    expect(exported.format).toBe('turf-academy-records-v1');
    expect(Object.keys(exported.records)).toHaveLength(28);
    expect(exported.records.academy_settings).toHaveLength(1);
    expect(exported.records).not.toHaveProperty('qr_profiles');
    expect(exported.records).not.toHaveProperty('audit_logs');
  } finally {
    await download.delete();
  }
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: 'Academy records exported.' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Academy Data Export' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

for (const role of ['receptionist', 'coach', 'parent']) {
  test(`${role} cannot open admin settings tools`, async ({ page }) => {
    await login(page, `${role}@turf.local`);
    for (const tool of ['roles', 'permissions', 'theme', 'backup']) {
      await page.goto(`/settings/${tool}`);
      await expect(page).toHaveURL(/\/unauthorized$/);
    }
  });
}
