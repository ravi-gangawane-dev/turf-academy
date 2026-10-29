import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { login } from './helpers';

test('operator-assisted recovery: reset, sign-in, old password and code rejection', async ({ page }) => {
  test.setTimeout(120_000);
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!key) throw new Error('Supply the operator key through the process environment.');
  const url = 'https://ttuigbkaluozglzgepsh.supabase.co';
  const publicKey = 'sb_publishable_rWM0j3-x9zSCcGKeo_ImXw_lxNKPyyR';
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, key, options);
  const client = () => createClient(url, publicKey, options);
  const email = `recovery-${randomUUID()}@turf.local`;
  const oldPassword = `Old!9${randomUUID()}`;
  const newPassword = `New!9${randomUUID()}`;
  let userId: string | undefined;
  try {
    const created = await admin.auth.admin.createUser({ email, password: oldPassword, email_confirm: true });
    expect(!created.error && !!created.data.user).toBe(true);
    userId = created.data.user!.id;
    await page.goto('/auth/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Incorrect!Password9');
    await page.locator('button.login-button').click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login$/);
    const generated = await admin.auth.admin.generateLink({ type: 'recovery', email });
    expect(!generated.error && !!generated.data.properties?.email_otp).toBe(true);
    const code = generated.data.properties!.email_otp;
    console.log(`Recovery code length: ${code.length} digits`);
    expect(/^\d{6,10}$/.test(code)).toBe(true);
    await page.goto('/auth/otp');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Verification code').fill(code === '00000000' ? '11111111' : '00000000');
    await page.getByRole('button', { name: 'Verify code', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('invalid or has expired');
    await expect(page).toHaveURL(/\/auth\/otp$/);
    await page.getByLabel('Verification code').fill(code);
    await page.getByRole('button', { name: 'Verify code', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/reset-password$/);
    await page.getByLabel('New password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm password', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Update password', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/password-updated$/);
    const signedOut = await page.evaluate(() => !Object.keys(localStorage).some(k => k.endsWith('-auth-token')));
    expect(signedOut).toBe(true);
    const rejected = await client().auth.signInWithPassword({ email, password: oldPassword });
    expect(!!rejected.error && !rejected.data.session).toBe(true);
    const replay = await client().auth.verifyOtp({ email, token: code, type: 'recovery' });
    expect(!!replay.error && !replay.data.session).toBe(true);
    await page.goto('/auth/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(newPassword);
    await page.locator('button.login-button').click();
    await expect(page).toHaveURL(/\/parent\//);
    console.log('PASS: recovery UI, password reset, logout, new-password UI login, old-password rejection, code replay rejection.');
  } finally {
    if (userId) {
      const removed = await admin.auth.admin.deleteUser(userId);
      expect(!removed.error).toBe(true);
      const absent = await admin.auth.admin.getUserById(userId);
      expect(!absent.data.user).toBe(true);
      console.log('PASS: disposable recovery account deleted and absence verified.');
    }
  }
});

for (const role of ['admin', 'receptionist', 'coach', 'parent']) {
  test(`${role} live login, restored session and logout`, async ({ page }) => {
    await login(page, `${role}@turf.local`);
    const dashboard = new URL(page.url()).pathname;
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${dashboard}$`));
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);
    await page.goto(dashboard);
    await expect(page).toHaveURL(/\/auth\/login/);
  });
}

test('forgot-password form sends email and origin-specific redirect and handles failure', async ({ page }) => {
  let calls = 0;
  await page.route('**/auth/v1/recover*', async route => {
    calls++;
    const request = route.request();
    expect(request.postDataJSON().email).toBe('recovery-ui@example.test');
    expect(new URL(request.url()).searchParams.get('redirect_to')).toBe('http://127.0.0.1:4202/auth/reset-password');
    await route.fulfill(calls === 1
      ? { status: 400, json: { msg: 'Email service unavailable', code: 'unexpected_failure' } }
      : { status: 200, json: {} });
  });
  await page.goto('/auth/login');
  await page.getByRole('link', { name: /forgot password/i }).click();
  await expect(page).toHaveURL(/\/auth\/forgot-password$/);
  await page.getByLabel('Email', { exact: true }).fill('recovery-ui@example.test');
  await page.getByRole('button', { name: 'Send recovery email', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await page.getByRole('button', { name: 'Send recovery email', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
  expect(calls).toBe(2);
});

test('expired recovery link offers a fresh request', async ({ page }) => {
  await page.goto('/auth/reset-password?error=access_denied');
  await expect(page.getByRole('alert')).toContainText('invalid or has expired');
  await page.getByRole('link', { name: 'Request a new reset link' }).click();
  await expect(page).toHaveURL(/\/auth\/forgot-password$/);
});
