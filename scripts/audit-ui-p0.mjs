import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

// Read-only baseline against the running application. No test records or submissions.
const baseURL = process.env.UI_AUDIT_URL || 'http://localhost:4200';
const directory = 'artifacts/ui-audit-p0';
await mkdir(directory, { recursive: true });
const report = { baseURL, capturedAt: new Date().toISOString(), screens: [], redirects: [], pageErrors: [] };
const persist = () => writeFile(`${directory}/public-audit.json`, JSON.stringify(report, null, 2));
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push({ url: page.url(), message: error.message }));
  for (const route of ['auth/login', 'auth/forgot-password', 'auth/reset-password', 'auth/set-password', 'auth/otp', 'auth/session-expired', 'auth/password-updated', 'unauthorized']) {
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${baseURL}/${route}`);
      await page.locator('h1:visible,h2:visible').first().waitFor();
      await page.screenshot({ path: `${directory}/${route.replaceAll('/', '-')}-${width}.png`, fullPage: true });
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      report.screens.push({ route, width, url: page.url(), dimensions, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, targets: v.nodes.map(n => n.target) })) });
      await persist();
    }
    console.log(`Captured and checked ${route}`);
  }
  for (const route of ['dashboard', 'students', 'parents', 'coaches', 'batches', 'enrollments', 'attendance', 'fees', 'payments', 'notifications', 'reports', 'settings', 'settings/dialog-playground', 'coach', 'parent']) {
    await page.goto(`${baseURL}/${route}`);
    await page.waitForURL('**/auth/login?**');
    report.redirects.push({ route, url: page.url(), loginRedirect: new URL(page.url()).pathname === '/auth/login' });
    await persist();
  }
} finally {
  await persist();
  await browser.close();
}
console.log(JSON.stringify({ screens: report.screens.length, violations: report.screens.reduce((n, s) => n + s.violations.length, 0), redirects: report.redirects.length, pageErrors: report.pageErrors.length }));
