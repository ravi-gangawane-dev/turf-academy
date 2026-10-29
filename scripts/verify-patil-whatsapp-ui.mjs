import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium, expect } from '@playwright/test';
const source = readFileSync('src/environments/environment.live.ts', 'utf8');
const url = source.match(/supabaseUrl:\s*'([^']+)'/)[1];
const client = createClient(url, source.match(/supabaseAnonKey:\s*'([^']+)'/)[1], { auth: { persistSession: false } });
const auth = await client.auth.signInWithPassword({ email: process.env.E2E_ADMIN_EMAIL ?? 'admin@turf.local', password: process.env.E2E_PASSWORD ?? 'academy123' });
if (auth.error) throw auth.error;
const fixture = JSON.parse(readFileSync('test-results/patil-records.json', 'utf8'));
const report = JSON.parse(readFileSync('test-results/patil-attendance.json', 'utf8'));
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  context.setDefaultTimeout(20000);
  await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`, session: auth.data.session });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4202/attendance/qr');
  await expect(page.locator('app-qr-attendance-page')).toBeVisible();
  report.clickToChat = [];
  for (const action of ['check_in', 'check_out']) {
    await page.getByRole('button', { name: `Prepare WhatsApp ${action === 'check_in' ? 'Check in' : 'Check out'} for Sunil Patil`, exact: true }).click();
    await expect(page.locator('app-whatsapp-action')).toContainText('+919130451715');
    await expect(page.locator('.preview')).toContainText('Hello Rahul Patil,');
    await page.evaluate(() => {
      const original = window.open.bind(window);
      window.open = (...args) => { window.lastWhatsAppUrl = String(args[0]); return original(...args); };
    });
    await page.getByRole('button', { name: /Open WhatsApp for parent/i }).click();
    await expect(page.locator('app-whatsapp-action [role="status"]')).toContainText('Delivery unconfirmed');
    const link = await page.evaluate(() => window.lastWhatsAppUrl);
    const parsed = new URL(link);
    expect(parsed.origin + parsed.pathname).toBe('https://wa.me/919130451715');
    expect(parsed.searchParams.get('text')).toContain('Hello Rahul Patil,');
    expect(parsed.searchParams.get('text')).toContain('Sunil Patil');
    expect(parsed.searchParams.get('text')).toContain(action === 'check_in' ? 'Check-in Time:' : 'Check-out Time:');
    report.clickToChat.push({ action, url: link, outcome: 'window.open invoked with validated URL; sending/delivery not confirmed' });
  }
  await page.screenshot({ path: 'test-results/patil-click-to-chat-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.whatsapp-open')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/patil-click-to-chat-mobile.png', fullPage: true });
  await page.goto('http://127.0.0.1:4202/notifications/failed');
  await page.locator('app-column-filter[label="recipient"] input').fill('9130451715');
  await expect(page.locator('main')).toContainText('ContentSid Required', { timeout: 30000 });
  report.notificationErrorDisplayed = true;
  await page.screenshot({ path: 'test-results/patil-notification-failures.png', fullPage: true });
  await page.goto('http://127.0.0.1:4202/parents/' + fixture.parentId + '/edit');
  await expect(page.locator('input[formControlName="whatsapp"]')).toHaveValue('+919130451715');
  expect(await page.evaluate(() => window.ng.getComponent(document.querySelector('app-parent-form-page')).form.controls.whatsapp.valid)).toBe(true);
  report.parentWhatsAppFormValid = true;
  console.log(JSON.stringify({ clickToChat: report.clickToChat, notificationErrorDisplayed: true }, null, 2));
} finally {
  writeFileSync('test-results/patil-attendance.json', JSON.stringify(report, null, 2));
  await browser.close(); await client.auth.signOut();
}
