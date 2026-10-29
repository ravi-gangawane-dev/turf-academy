import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

// Read-only review: uses existing role accounts and never submits business forms.
const phase = process.env.UI_AUDIT_PHASE || 'before';
const directory = `tmp/ui-review/${phase}`;
await mkdir(directory, { recursive: true });
const source = await readFile('e2e/live-role-pages.spec.ts', 'utf8');
const routes = runInNewContext(`(${source.match(/const roleRoutes = (\{[\s\S]*?\n\});/)[1]})`);
routes.admin.push('/settings/profile', '/settings/regional', '/settings/attendance', '/settings/fees', '/settings/notifications', '/settings/roles', '/settings/permissions', '/settings/theme', '/settings/backup', '/settings/audit-logs', '/search?q=academy');
routes.parent.push('/parent/coach', '/parent/receipts', '/parent/profile/edit');
const quick = process.env.UI_AUDIT_QUICK === '1';
const selected = {
  admin: ['/dashboard/admin', '/students', '/parents', '/coaches', '/batches', '/enrollments', '/attendance', '/fees', '/payments', '/settings', '/settings/permissions', '/settings/backup', '/settings/audit-logs', '/reports', '/students/add'],
  receptionist: ['/dashboard/reception'],
  coach: ['/coach/dashboard', '/coach/attendance', '/coach/profile'],
  parent: ['/parent/dashboard', '/parent/fees', '/parent/profile/edit'],
};
const browser = await chromium.launch();
const results = [];
try {
  for (const [role, paths] of Object.entries(quick ? selected : routes)) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`] || `${role}@turf.local`;
    const password = process.env.E2E_PASSWORD || 'academy123';
    await page.goto('http://127.0.0.1:4202/auth/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard/**', { timeout: 30000 }).catch(async () => {
      await page.waitForURL(`**/${role}/dashboard`, { timeout: 30000 });
    });
    if (!quick) {
      const client = createClient(process.env.VITE_SUPABASE_URL || 'https://ttuigbkaluozglzgepsh.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_rWM0j3-x9zSCcGKeo_ImXw_lxNKPyyR', { auth: { persistSession: false } });
      const auth = await client.auth.signInWithPassword({ email, password });
      if (auth.error) throw auth.error;
      const tables = role === 'parent' ? ['students'] : role === 'coach' ? ['students', 'batches'] : ['students', 'parents', 'coaches'];
      for (const table of tables) {
        const record = await client.from(table).select('id').limit(1).maybeSingle();
        if (record.error) throw record.error;
        if (record.data) {
          const prefix = role === 'parent' ? '/parent/children' : role === 'coach' ? `/coach/${table}` : `/${table}`;
          paths.push(`${prefix}/${record.data.id}`);
          if (role === 'admin' || role === 'receptionist' && table !== 'coaches' || role === 'parent') paths.push(`${prefix}/${record.data.id}/edit`);
        }
      }
      await client.auth.signOut();
    }
    for (const route of paths) {
      const startErrors = errors.length;
      try {
        await page.goto(`http://127.0.0.1:4202${route}`);
        await page.locator('main h1').first().waitFor({ timeout: 20000 });
        await page.waitForFunction(() => !document.querySelector('main .pi-spinner'), { timeout: 20000 }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        for (const width of [1440, 768, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.workspace > main')?.scrollTo(0, 0); return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
          const metrics = await page.evaluate(() => {
            const visible = (node) => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
            const describe = (node) => {
              const style = getComputedStyle(node), box = node.getBoundingClientRect();
              return { tag: node.tagName, class: node.className, font: style.fontSize, color: style.color, background: style.backgroundColor, radius: style.borderRadius, height: Math.round(box.height), x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width) };
            };
            const main = document.querySelector('main');
            return {
              overflow: document.documentElement.scrollWidth - innerWidth,
              mainOverflow: main.scrollWidth - main.clientWidth,
              headings: [...main.querySelectorAll('h1')].filter(visible).map(describe),
              buttons: [...main.querySelectorAll('button, a.primary, a.app-button')].filter(visible).slice(0, 35).map(describe),
              inputs: [...main.querySelectorAll('input:not([type=checkbox]):not([type=radio]),select,textarea')].filter(visible).slice(0, 20).map(describe),
              metrics: [...main.querySelectorAll('.metrics strong, .summary-grid strong, .student-metrics strong')].filter(visible).map(describe),
            };
          });
          const file = `${role}-${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}-${width}.png`;
          await page.screenshot({ path: `${directory}/${file}`, animations: 'disabled' });
          results.push({ role, route, width, file, ...metrics, errors: errors.slice(startErrors) });
        }
        console.log(`${role}: ${route}`);
      } catch (error) {
        results.push({ role, route, error: error.message });
        console.log(`REVIEW FAILED: ${role} ${route}: ${error.message.split('\n')[0]}`);
      }
      await writeFile(`${directory}/report.json`, JSON.stringify(results, null, 2));
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Saved ${results.length} page/viewport reviews in ${directory}`);
