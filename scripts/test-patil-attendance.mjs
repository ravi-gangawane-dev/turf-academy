import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium, expect } from '@playwright/test';
const source = readFileSync('src/environments/environment.live.ts', 'utf8');
const url = source.match(/supabaseUrl:\s*'([^']+)'/)[1];
const client = createClient(url, source.match(/supabaseAnonKey:\s*'([^']+)'/)[1], { auth: { persistSession: false } });
const checked = async request => { const r = await request; if (r.error) throw r.error; return r.data; };
const auth = await checked(client.auth.signInWithPassword({ email: process.env.E2E_ADMIN_EMAIL ?? 'admin@turf.local', password: process.env.E2E_PASSWORD ?? 'academy123' }));
const fixture = JSON.parse(readFileSync('test-results/patil-records.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext();
await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`, session: auth.session });
context.setDefaultTimeout(20000);
const page = await context.newPage();
const report = { parentId: fixture.parentId, studentId: fixture.studentId, ui: [], flows: [], errors: [] };
page.on('pageerror', e => report.errors.push(e.message));
try {
  for (const [route, name] of [['/students', 'Sunil Patil'], ['/parents', 'Rahul Patil'], ['/students/' + fixture.studentId, 'Sunil Patil'], ['/parents/' + fixture.parentId, 'Rahul Patil'], ['/dashboard/admin', 'Dashboard']]) {
    await page.goto('http://127.0.0.1:4202' + route);
    if (route === '/students' || route === '/parents') {
      const search = page.locator('main app-column-filter input').first();
      await search.fill(name);
    }
    await expect(page.locator('main')).toContainText(name, { timeout: 30000 });
    report.ui.push({ route, result: 'passed' });
  }
  for (const action of ['check_in', 'check_out']) {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    let attendance = await checked(client.from('attendance_records').select('*').eq('student_id', fixture.studentId).eq('attendance_date', date).maybeSingle());
    console.log('Testing', action, attendance?.check_in_at, attendance?.check_out_at);
    const saved = action === 'check_in' ? attendance?.check_in_at : attendance?.check_out_at;
    let popupUrl;
    if (!saved) {
      await page.goto('http://127.0.0.1:4202/attendance/manual-check-' + (action === 'check_in' ? 'in' : 'out'));
      console.log('Attendance page', page.url());
      await page.getByLabel(action === 'check_in' ? 'Search students' : 'Search checked-in students', { exact: true }).fill('Sunil Patil');
      await page.locator('label').filter({ hasText: 'Sunil Patil' }).locator('input[type=checkbox]').check();
      await page.getByRole('button', { name: action === 'check_in' ? 'Mark Check In' : 'Mark Check Out', exact: true }).click();
      await expect(page.locator('app-whatsapp-action')).toContainText('+919130451715', { timeout: 30000 });
      const popupPromise = context.waitForEvent('page');
      await page.getByRole('button', { name: /Open WhatsApp for parent/i }).click();
      const popup = await popupPromise;
      await popup.waitForURL(/wa\.me|whatsapp\.com/, { timeout: 30000 }).catch(() => {});
      popupUrl = popup.url();
      await popup.close();
      attendance = await checked(client.from('attendance_records').select('*').eq('student_id', fixture.studentId).eq('attendance_date', date).single());
    }
    const link = await checked(client.from('student_parents').select('parents(*)').eq('student_id', fixture.studentId).eq('is_primary', true).single());
    const parent = link.parents;
    if (!/^\+91[6-9]\d{9}$/.test(parent.whatsapp)) throw Error('Invalid parent phone');
    const timestamp = action === 'check_in' ? attendance.check_in_at : attendance.check_out_at;
    const time = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', timeStyle: 'medium' }).format(new Date(timestamp));
    const kind = action === 'check_in' ? 'in' : 'out';
    const body = `Hello ${parent.full_name},\n\nYour child Sunil Patil has successfully checked ${kind} ${kind === 'in' ? 'at' : 'from'} Turf Cricket Academy.\n\nDate: ${date}\nCheck-${kind} Time: ${time}\n\n— Turf Cricket Academy`;
    const id = await checked(client.rpc('queue_parent_message', { p_parent_id: parent.id, p_channel: 'whatsapp', p_subject: `Student checked ${kind}`, p_body: body, p_reference: `patil-test:${attendance.id}:${action}` }));
    let notice = await checked(client.from('notifications').select('*').eq('id', id).single());
    if (!notice.provider_message_id && notice.status === 'queued') {
      const sent = await client.functions.invoke('notification-delivery', { body: { action: 'send', id } });
      let detail = sent.data;
      if (sent.error?.context) detail = await sent.error.context.json().catch(() => ({ error: sent.error.message }));
      report.flows.push({ action, attendanceId: attendance.id, timestamp, popupUrl, notificationId: id, sendResponse: detail });
    } else report.flows.push({ action, attendanceId: attendance.id, timestamp, popupUrl, notificationId: id, reused: true });
    notice = await checked(client.from('notifications').select('*').eq('id', id).single());
    if (notice.provider_message_id) await client.functions.invoke('notification-delivery', { body: { action: 'status', id } });
    report.flows.at(-1).notification = await checked(client.from('notifications').select('id,parent_id,recipient,status,provider_message_id,failure_reason,delivery_uncertain').eq('id', id).single());
    report.flows.at(-1).automaticNotices = await checked(client.from('notifications').select('id,channel,template_key,status').eq('student_id', fixture.studentId).eq('template_key', 'attendance_' + action));
    writeFileSync('test-results/patil-attendance.json', JSON.stringify(report, null, 2));
  }
} catch (error) {
  report.errors.push(error.message);
  await page.screenshot({ path: 'test-results/patil-error.png', fullPage: true });
  console.log((await page.locator('body').innerText()).slice(-4000));
  process.exitCode = 1;
} finally {
  writeFileSync('test-results/patil-attendance.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close(); await client.auth.signOut();
}
