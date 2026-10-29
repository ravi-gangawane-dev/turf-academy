import { expect, test } from '@playwright/test';
import { login } from './helpers';

for (const width of [1440, 390]) {
  test(`shared table titles, counts, export alignment and padding at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    for (const route of ['/students', '/parents', '/coaches', '/batches', '/enrollments', '/fees', '/fees/plans', '/payments', '/notifications', '/settings/audit-logs']) {
      await page.goto(route);
      const toolbar = page.locator('app-table-tools').first();
      await expect(toolbar).toBeVisible();
      await expect(toolbar.locator('h2')).not.toBeEmpty();
      await expect(toolbar.locator('.table-tools-count')).toHaveText(/^\d+$/);
      const button = toolbar.getByRole('button', { name: /export/i });
      await expect(button).toBeVisible();
      const bounds = await toolbar.boundingBox();
      const buttonBounds = await button.boundingBox();
      expect(Math.abs(bounds!.x + bounds!.width - buttonBounds!.x - buttonBounds!.width - 8), route).toBeLessThanOrEqual(2);
      const cell = page.locator('table thead th').first();
      await expect(cell).toHaveCSS('padding-top', '8px');
      await expect(cell).toHaveCSS('padding-right', '8px');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
    }
  });
}

test('fallback export downloads the displayed data and ignores action columns', async ({ page }) => {
  await login(page);
  // The permissions matrix is deterministic in mock mode; directory APIs require Supabase.
  await page.goto('/settings/permissions');
  const toolbar = page.locator('app-table-tools');
  await expect(toolbar.getByRole('button', { name: 'Export page' })).toBeEnabled();
  await expect(toolbar.locator('.table-tools-count')).toHaveText('4');
  await page.locator('table').evaluate((table: HTMLTableElement) => {
    const actions = document.createElement('th');
    actions.textContent = 'Actions';
    table.tHead!.rows[0].append(actions);
    for (const row of Array.from(table.tBodies[0].rows)) row.insertCell().textContent = 'Edit';
    table.tBodies[0].rows[0].cells[0].textContent = '=SUM(1,2)';
  });
  const downloadPromise = page.waitForEvent('download');
  await toolbar.getByRole('button', { name: 'Export page' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('role-permissions-page.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain('Role');
  expect(csv).toContain('"\'=SUM(1,2)"');
  expect(csv.split('\r\n').length).toBeGreaterThan(1);
  expect(csv.split('\r\n')[0]).not.toContain('Actions');
});
