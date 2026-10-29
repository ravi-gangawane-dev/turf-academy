import { test as base, expect, Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { signIn } from './live-fixtures';
import { login } from './helpers';

interface Player { id: string; name: string; parentId: string; parentName: string; token: string }
interface Fixture { client: SupabaseClient; batchId: string; suffix: string; create: (label: string) => Promise<Player> }
const test = base.extend<{ fixture: Fixture }>({
  fixture: async (_fixtures, use) => {
    const { client } = await signIn('admin');
    const suffix = crypto.randomUUID().slice(0, 8);
    const students: string[] = [], parents: string[] = [];
    let batchId = '', planId = '';
    const checked = async (request: PromiseLike<any>): Promise<any> => {
      const result = await request;
      if (result.error) throw new Error(result.error.message);
      return result.data;
    };
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const patilBefore = await checked(client.from('attendance_records').select('id,check_in_at,check_out_at,status').eq('student_id', '3b323daf-af9e-469b-876a-7d0477efac58').order('id'));
    try {
      planId = (await checked(client.from('fee_plans').insert({ name: `WA E2E ${suffix}`, monthly_fee: 0 }).select('id').single())).id;
      batchId = (await checked(client.from('batches').insert({ code: `WA-${suffix}`, name: `WA E2E ${suffix}`, capacity: 10, fee_plan_id: planId }).select('id').single())).id;
      await use({ client, batchId, suffix, create: async label => {
        const name = `WA ${label} ${suffix}`, parentName = `WA Guardian ${label} ${suffix}`;
        const id = await checked(client.rpc('create_student_profile', { p_payload: {
          full_name: name, date_of_birth: '2014-06-07', parent_name: parentName,
          parent_phone: '+919130451715', joined_on: today, batch_id: batchId,
        } }));
        students.push(id);
        const link = await checked(client.from('student_parents').select('parent_id,is_primary').eq('student_id', id).single());
        parents.push(link.parent_id);
        expect(link.is_primary).toBe(true);
        const qr = await checked(client.from('qr_profiles').select('public_token').eq('student_id', id).single());
        return { id, name, parentName, parentId: link.parent_id, token: qr.public_token };
      } });
    } finally {
      const failures: string[] = [];
      const cleanup = async (request: PromiseLike<any>) => { const r = await request; if (r.error) failures.push(r.error.message); };
      // Remove only IDs created by this fixture; keep ordinary audit history intact.
      if (parents.length) await cleanup(client.from('notifications').delete().in('parent_id', parents));
      for (const id of students) await cleanup(client.rpc('delete_student_profile', { p_student_id: id }));
      if (parents.length) await cleanup(client.from('parents').delete().in('id', parents));
      if (batchId) await cleanup(client.from('batches').delete().eq('id', batchId));
      if (planId) await cleanup(client.from('fee_plans').delete().eq('id', planId));
      if (students.length) expect(await checked(client.from('students').select('id').in('id', students))).toEqual([]);
      if (parents.length) expect(await checked(client.from('parents').select('id').in('id', parents))).toEqual([]);
      expect(await checked(client.from('attendance_records').select('id,check_in_at,check_out_at,status').eq('student_id', '3b323daf-af9e-469b-876a-7d0477efac58').order('id'))).toEqual(patilBefore);
      await client.auth.signOut();
      expect(failures, 'Fixture cleanup must succeed').toEqual([]);
    }
  },
});

async function savedAttendance(client: SupabaseClient, studentId: string) {
  const result = await client.from('attendance_records').select('*').eq('student_id', studentId).single();
  expect(result.error).toBeNull();
  return result.data!;
}

async function verifyAndOpen(page: Page, player: Player, action: 'check_in' | 'check_out', timestamp: string, phone = '919130451715') {
  const card = page.locator('app-whatsapp-action').filter({ hasText: player.name });
  const time = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', timeStyle: 'short' }).format(new Date(timestamp));
  await expect(card.locator('.preview')).toContainText(`Hello ${player.parentName},`);
  await expect(card.locator('.preview')).toContainText(time);
  await expect(card.locator('.preview')).toContainText(action === 'check_in' ? 'Check-in Time:' : 'Check-out Time:');
  // Observe a real new-window request; do not intercept WhatsApp or press Send there.
  const outgoing = page.context().waitForEvent('request', { predicate: r => r.url().startsWith('https://wa.me/'), timeout: 20000 });
  await card.getByRole('button', { name: /Open WhatsApp for parent/i }).click();
  const request = await outgoing;
  const url = new URL(request.url());
  expect(url.origin + url.pathname).toBe(`https://wa.me/${phone}`);
  expect(url.searchParams.get('text')).toContain(player.name);
  expect(url.searchParams.get('text')).toContain(`Hello ${player.parentName},`);
  expect(url.searchParams.get('text')).toContain(time);
  await expect(card.getByRole('status')).toContainText('Delivery unconfirmed');
}

for (const role of ['admin', 'receptionist']) {
  test(`${role}: real QR check-in and checkout, saved timestamps, dynamic recipient, mobile and repeat protection`, async ({ page, fixture }, info) => {
    test.setTimeout(120000);
    const player = await fixture.create(role);
    const errors: string[] = [], apiSends: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', r => { if (r.url().includes('/functions/v1/notification-delivery') && r.postData()?.includes('"send"')) apiSends.push(r.url()); });
    await login(page, `${role}@turf.local`);
    await page.goto('/attendance/qr');
    for (const action of ['check_in', 'check_out'] as const) {
      await page.getByLabel('Student QR code', { exact: true }).fill(player.token);
      await page.getByRole('button', { name: 'Identify student', exact: true }).click();
      await expect(page.locator('.scan-result')).toContainText(player.name);
      await page.getByRole('button', { name: action === 'check_in' ? 'Confirm check in' : 'Confirm check out', exact: true }).click();
      await expect(page.locator('app-whatsapp-action')).toContainText(player.parentName);
      const row = await savedAttendance(fixture.client, player.id);
      expect(row.batch_id).toBe(fixture.batchId);
      await verifyAndOpen(page, player, action, action === 'check_in' ? row.check_in_at : row.check_out_at);
    }
    const row = await savedAttendance(fixture.client, player.id);
    expect(Date.parse(row.check_out_at)).toBeGreaterThanOrEqual(Date.parse(row.check_in_at));
    expect(row.status).toBe('checked_out');
    const notices = await fixture.client.from('notifications').select('channel,template_key,parent_id').eq('student_id', player.id);
    expect(notices.error).toBeNull();
    expect(notices.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'in_app', template_key: 'attendance_check_in', parent_id: player.parentId }),
      expect.objectContaining({ channel: 'in_app', template_key: 'attendance_check_out', parent_id: player.parentId }),
    ]));
    expect(notices.data?.filter(n => n.channel === 'whatsapp')).toHaveLength(0);
    await page.getByLabel('Student QR code', { exact: true }).fill(player.token);
    await page.getByRole('button', { name: 'Identify student', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Already checked out', exact: true })).toBeDisabled();
    await page.reload();
    await page.getByRole('button', { name: `Prepare WhatsApp Check out for ${player.name}`, exact: true }).click();
    await expect(page.locator('.preview')).toContainText(player.name);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.whatsapp-open')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator('app-whatsapp-action').screenshot({ path: info.outputPath('mobile-parent-message.png') });
    expect((await savedAttendance(fixture.client, player.id)).check_out_at).toBe(row.check_out_at);
    expect(errors).toEqual([]);
    expect(apiSends).toEqual([]);
  });
}

test('bulk manual attendance preserves every save and handles invalid, missing and opted-out parents', async ({ page, fixture }) => {
  test.setTimeout(120000);
  const valid = await fixture.create('Valid'), invalid = await fixture.create('Invalid'), missing = await fixture.create('Missing'), optedOut = await fixture.create('OptedOut');
  expect((await fixture.client.from('parents').update({ whatsapp: '123' }).eq('id', invalid.parentId)).error).toBeNull();
  expect((await fixture.client.from('student_parents').delete().eq('student_id', missing.id).eq('parent_id', missing.parentId)).error).toBeNull();
  expect((await fixture.client.from('parents').update({ communication_preferences: { whatsapp: false } }).eq('id', optedOut.parentId)).error).toBeNull();
  await login(page);
  await page.goto('/attendance/qr');
  await page.getByLabel('Search students', { exact: true }).fill(fixture.suffix);
  for (const player of [valid, invalid, missing, optedOut]) await page.getByRole('checkbox', { name: `Check in ${player.name} in WA E2E ${fixture.suffix}`, exact: true }).check();
  await page.getByRole('button', { name: 'Mark Check In', exact: true }).click();
  await expect(page.locator('app-whatsapp-action')).toHaveCount(4);
  await expect(page.locator('app-whatsapp-action').filter({ hasText: invalid.name }).getByRole('button')).toBeDisabled();
  await expect(page.locator('app-whatsapp-action').filter({ hasText: missing.name })).toContainText('No active parent is linked');
  await expect(page.locator('app-whatsapp-action').filter({ hasText: optedOut.name })).toContainText('WhatsApp notifications are disabled');
  for (const player of [valid, invalid, missing, optedOut]) expect((await savedAttendance(fixture.client, player.id)).check_in_at).toBeTruthy();
  await verifyAndOpen(page, valid, 'check_in', (await savedAttendance(fixture.client, valid.id)).check_in_at);
  // Changing the parent's number must affect the prepared message without touching the student.
  expect((await fixture.client.from('parents').update({ whatsapp: '+919130451716' }).eq('id', valid.parentId)).error).toBeNull();
  await page.getByRole('button', { name: `Prepare WhatsApp Check in for ${valid.name}`, exact: true }).click();
  await expect(page.locator('app-whatsapp-action')).toContainText('+919130451716');
  // Do not open WhatsApp for this synthetic changed recipient.
  expect((await fixture.client.from('parents').update({ whatsapp: '+919130451715' }).eq('id', valid.parentId)).error).toBeNull();
  await page.getByLabel('Search checked-in students', { exact: true }).fill(fixture.suffix);
  for (const player of [valid, invalid, missing, optedOut]) await page.getByRole('checkbox', { name: `Check out ${player.name} in WA E2E ${fixture.suffix}`, exact: true }).check();
  await page.getByRole('button', { name: 'Mark Check Out', exact: true }).click();
  await expect(page.locator('app-whatsapp-action')).toHaveCount(4);
  for (const player of [valid, invalid, missing, optedOut]) expect((await savedAttendance(fixture.client, player.id)).status).toBe('checked_out');
  await verifyAndOpen(page, valid, 'check_out', (await savedAttendance(fixture.client, valid.id)).check_out_at);
});
