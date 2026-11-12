import { expect, test } from '@playwright/test';

// Keep interception at the browser layer; service-worker behavior has its own test.
test.use({ serviceWorkers: 'block' });

test('production error handler uses the same-origin collector and reports uncaught errors', async ({ page }) => {
  // Serve the actual function locally; no external report is sent by this test.
  const { default: handler } = await import('../../netlify/functions/client-errors.mjs');
  const reports: unknown[] = [];
  await page.route('**/.netlify/functions/client-errors', async route => {
    const request = route.request();
    const response = await handler(new Request(request.url(), {
      method: request.method(), headers: request.headers(), body: request.postData(),
    }));
    reports.push({ status: response.status, payload: request.postDataJSON() });
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  await page.evaluate(() => history.replaceState(null, '', '/auth/login?qa=not-for-logs'));
  await page.evaluate(() => { setTimeout(() => { throw new Error('QA production monitoring test'); }, 0); });
  await expect.poll(() => reports.length).toBe(1);
  expect(reports[0]).toMatchObject({ status: 202, payload: { message: 'QA production monitoring test', url: 'http://127.0.0.1:4300/auth/login' } });
});
