import { expect, test } from '@playwright/test';

test('production serves a valid manifest and registers its service worker', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page).toHaveURL(/\/auth\/login/);
  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const body = await manifest.json();
  expect(body.name).toBeTruthy();
  expect(body.icons.length).toBeGreaterThan(0);
  expect(body.display).toBe('standalone');
  for (const icon of body.icons) {
    expect((await page.request.get(icon.src)).ok()).toBe(true);
  }
  const registration = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return null;
    const ready = await navigator.serviceWorker.ready;
    return ready.active?.scriptURL ?? null;
  });
  expect(registration).toContain('ngsw-worker.js');
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Login to/i })).toBeVisible();
  await page.context().setOffline(false);
  await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Login to/i })).toBeVisible();
});
