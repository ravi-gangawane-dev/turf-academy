import { expect } from '@playwright/test';
import { test } from './live-fixtures';
import { createClient } from '@supabase/supabase-js';
import { login } from './helpers';

const supabaseUrl = process.env['VITE_SUPABASE_URL'] ?? 'https://ttuigbkaluozglzgepsh.supabase.co';
const supabaseKey =
  process.env['VITE_SUPABASE_ANON_KEY'] ?? 'sb_publishable_rWM0j3-x9zSCcGKeo_ImXw_lxNKPyyR';
const password = process.env['E2E_PASSWORD'] ?? 'academy123';

function client() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(role: 'admin' | 'coach') {
  const supabase = client();
  const result = await supabase.auth.signInWithPassword({
    email: process.env[`E2E_${role.toUpperCase()}_EMAIL`] ?? `${role}@turf.local`,
    password,
  });
  expect(result.error).toBeNull();
  return { supabase, user: result.data.user! };
}

test('live Coach scope, calendar batch filters, and query latency are valid', async () => {
  const coach = client();
  const signIn = await coach.auth.signInWithPassword({
    email: process.env['E2E_COACH_EMAIL'] ?? 'coach@turf.local',
    password: process.env['E2E_PASSWORD'] ?? 'academy123',
  });
  expect(signIn.error).toBeNull();

  const coachRow = await coach
    .from('coaches')
    .select('id')
    .eq('profile_id', signIn.data.user!.id)
    .single();
  expect(coachRow.error).toBeNull();
  expect(coachRow.data?.id).toBeTruthy();

  const startedAt = Date.now();
  const [assignments, events] = await Promise.all([
    coach.from('batch_coaches').select('batch_id').eq('coach_id', coachRow.data!.id),
    coach.from('coach_attendance_events').select('coach_id,batch_id').limit(100),
  ]);
  expect(assignments.error).toBeNull();
  expect(events.error).toBeNull();
  expect(events.data?.every((event) => event.coach_id === coachRow.data!.id)).toBe(true);

  const batchId = assignments.data?.[0]?.batch_id;
  if (batchId) {
    const filteredStudents = await coach
      .from('enrollments')
      .select('student_id,batch_id')
      .eq('status', 'active')
      .eq('batch_id', batchId);
    expect(filteredStudents.error).toBeNull();
    expect(filteredStudents.data?.every((row) => row.batch_id === batchId)).toBe(true);
  }

  expect(Date.now() - startedAt).toBeLessThan(5_000);
  await coach.auth.signOut();
});

test('academy settings and refunds enforce Admin RLS', async () => {
  const [{ supabase: admin }, { supabase: coach }] = await Promise.all([
    signIn('admin'),
    signIn('coach'),
  ]);
  try {
    const settings = await admin
      .from('academy_settings')
      .select('id,academy_name,timezone,currency_code')
      .single();
    expect(settings.error).toBeNull();
    expect(settings.data).toEqual(expect.objectContaining({ id: true, currency_code: 'INR' }));

    const coachWrite = await coach
      .from('academy_settings')
      .update({ academy_name: settings.data!.academy_name })
      .eq('id', true)
      .select('id');
    expect(coachWrite.error).toBeNull();
    expect(coachWrite.data).toEqual([]);

    const coachRefund = await coach.rpc('refund_payment', {
      p_payment_id: crypto.randomUUID(),
      p_amount: 1,
      p_reason: 'RLS verification',
      p_client_reference: crypto.randomUUID(),
    });
    expect(coachRefund.error).not.toBeNull();

    const payment = await admin
      .from('payments')
      .select('id,amount')
      .in('status', ['successful', 'partially_refunded'])
      .limit(1)
      .maybeSingle();
    expect(payment.error).toBeNull();
    if (payment.data) {
      const excessive = await admin.rpc('refund_payment', {
        p_payment_id: payment.data.id,
        p_amount: Number(payment.data.amount) + 1,
        p_reason: 'Excess refund verification',
        p_client_reference: crypto.randomUUID(),
      });
      expect(excessive.error).not.toBeNull();
    }
  } finally {
    await Promise.all([admin.auth.signOut(), coach.auth.signOut()]);
  }
});

test('Admin manages notification templates and reads Coach performance report', async () => {
  const { supabase: admin } = await signIn('admin');
  const key = `e2e_template_${crypto.randomUUID().replaceAll('-', '')}`;
  let templateId = '';
  try {
    const created = await admin
      .from('notification_templates')
      .insert({
        name: `E2E ${key}`,
        template_key: key,
        channel: 'in_app',
        body: 'Training starts at {{time}}.',
      })
      .select('id,status')
      .single();
    expect(created.error).toBeNull();
    templateId = created.data!.id;
    const disabled = await admin
      .from('notification_templates')
      .update({ status: 'inactive' })
      .eq('id', templateId)
      .select('status')
      .single();
    expect(disabled.error).toBeNull();
    expect(disabled.data!.status).toBe('inactive');
    const today = new Date().toISOString().slice(0, 10);
    const report = await admin.rpc('get_admin_coach_report', { p_from: today, p_to: today });
    expect(report.error).toBeNull();
    expect(
      report.data?.every(
        (row: { attendance_percent: number }) =>
          Number(row.attendance_percent) >= 0 && Number(row.attendance_percent) <= 100,
      ),
    ).toBe(true);
  } finally {
    if (templateId) await admin.from('notification_templates').delete().eq('id', templateId);
    await admin.auth.signOut();
  }
});

test('scoped realtime delivers assigned attendance and hides unrelated Coach events', async ({ academy }) => {
  const { admin, coach, coachUserId, attendanceId, batchId } = academy;
  const coachRow = await coach.from('coaches').select('id').eq('profile_id', coachUserId).single();
  expect(coachRow.error).toBeNull();
  const events: { coach_id: string; batch_id: string }[] = [];
  const channel = coach.channel('e2e-' + academy.suffix).on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'coach_attendance_events', filter: 'coach_id=eq.' + coachRow.data!.id,
  }, payload => events.push(payload.new as { coach_id: string; batch_id: string }));
  try {
    await coach.realtime.setAuth((await coach.auth.getSession()).data.session!.access_token);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Realtime subscription did not become ready')), 20_000);
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(new Error(status)); }
      });
    });
    expect((await admin.from('attendance_records').update({ status: 'present' }).eq('id', attendanceId)).error).toBeNull();
    await expect.poll(() => events.some(event => event.batch_id === batchId), { timeout: 20_000 }).toBe(true);
    expect(events.every(event => event.coach_id === coachRow.data!.id)).toBe(true);
    const visible = await coach.from('coach_attendance_events').select('coach_id,batch_id').in('batch_id', [batchId, academy.otherBatchId]);
    expect(visible.error).toBeNull();
    expect(visible.data!.length).toBeGreaterThan(0);
    expect(visible.data!.every(event => event.coach_id === coachRow.data!.id && event.batch_id === batchId)).toBe(true);
  } finally { await coach.removeChannel(channel); }
});

test('calendar narrows students at database level and renders month, week, and list', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await login(page, 'admin@turf.local');
  await page.goto('/attendance/calendar');
  const batch = page.getByLabel('Select Batch');
  await expect(batch.locator('option')).not.toHaveCount(1);
  const student = page.getByLabel('Select Student');
  await expect.poll(() => student.locator('option').count()).toBeGreaterThan(1);

  // The student dropdown lists the whole academy once; batch scope is enforced by the
  // server. Prove database-level narrowing by asserting the day-stats request carries
  // the selected batch instead of assuming the dropdown is batch-filtered.
  const statsRequest = page.waitForRequest(
    (request) =>
      request.url().includes('/rpc/get_attendance_day_stats') && request.method() === 'POST',
  );
  await batch.selectOption({ index: 1 });
  const selectedBatch = await batch.inputValue();
  expect(selectedBatch).not.toBe('');
  const request = await statsRequest;
  expect(String(request.postDataJSON()?.['p_batch_id'])).toBe(selectedBatch);
  await student.selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Week \d+/ })).toBeVisible();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Attendance Records' })).toBeVisible();
});

test('Coach dashboard keeps healthy panels visible when sessions and notifications fail', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.route('**/rest/v1/training_sessions*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'E2E sessions failure' }),
    }),
  );
  await page.route('**/rest/v1/notifications*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'E2E notifications failure' }),
    }),
  );
  await login(page, 'coach@turf.local');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const panelsLoading = page.getByText('Dashboard panels are loading independently…');
  await expect(panelsLoading).toBeHidden({ timeout: 30_000 });
  await expect(page.getByRole('alert').filter({ hasText: 'Sessions:' })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Notifications:' })).toBeVisible();
  await expect(page.getByText(/Assigned batches|My batches/i).first()).toBeVisible();
});

test('offline Coach attendance queues, reconnects, and synchronizes', async ({ page, context, academy }) => {
  test.setTimeout(90_000);
  const { admin } = academy;
  const assignment = { data: { batch_id: academy.batchId } };
  const enrollment = { data: { student_id: academy.studentId } };
  const today = new Date().toISOString().slice(0, 10);
  expect((await admin.from('attendance_records').delete().eq('id', academy.attendanceId)).error).toBeNull();
  try {
    await login(page, 'coach@turf.local');
    await page.goto('/coach/attendance/check-in-out');
    const batch = page.locator('label').filter({ hasText: 'Assigned batch' }).locator('select');
    await batch.selectOption(assignment.data!.batch_id);
    const student = page
      .locator('label')
      .filter({ hasText: /^Student/ })
      .locator('select');
    await expect.poll(() => student.locator('option').count()).toBeGreaterThan(1);
    await student.selectOption(enrollment.data!.student_id);
    await context.setOffline(true);
    await page.locator('.attendance-form .submit-attendance').click();
    await expect(
      page.getByText('Attendance queued offline and will sync when the connection returns.'),
    ).toBeVisible();
    await expect
      .poll(          () =>
            page.evaluate(async () => {
              const database = await new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open('turf-academy-offline', 1);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
              });
          return new Promise<number>((resolve, reject) => {
            const request = database
              .transaction('attendance-outbox')
              .objectStore('attendance-outbox')
              .count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        }),
      )
      .toBe(1);
    await context.setOffline(false);
    await expect
      .poll(
        async () => {
          const result = await admin
            .from('attendance_records')
            .select('id')
            .eq('student_id', enrollment.data!.student_id)
            .eq('batch_id', assignment.data!.batch_id)
            .eq('attendance_date', today)
            .maybeSingle();
          return Boolean(result.data);
        },
        { timeout: 20_000 },
      )
      .toBe(true);
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const database = await new Promise<IDBDatabase>((resolve, reject) => {
              const request = indexedDB.open('turf-academy-offline', 1);
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
            return new Promise<number>((resolve, reject) => {
              const request = database
                .transaction('attendance-outbox')
                .objectStore('attendance-outbox')
                .count();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
          }),
        { timeout: 20_000 },
      )
      .toBe(0);
  } finally {
    await context.setOffline(false);
    await admin
      .from('attendance_records')
      .delete()
      .eq('student_id', enrollment.data!.student_id)
      .eq('batch_id', assignment.data!.batch_id)
      .eq('attendance_date', today);

  }
});

test('Coach paginated history remains bounded under concurrent query load', async () => {
  const { supabase: coach, user } = await signIn('coach');
  const coachRow = await coach.from('coaches').select('id').eq('profile_id', user.id).single();
  const assignments = await coach
    .from('batch_coaches')
    .select('batch_id')
    .eq('coach_id', coachRow.data!.id);
  const batchIds = assignments.data!.map((row) => row.batch_id);
  const durations: number[] = [];
  const requests = Array.from({ length: 25 }, async (_, _index) => {
    const started = performance.now();
    const result = await coach
      .from('attendance_records')
      .select('id', { count: 'exact' })
      .in('batch_id', batchIds)
      .range(0, 19);
    durations.push(performance.now() - started);
    expect(result.error).toBeNull();
    expect(result.data!.length).toBeLessThanOrEqual(20);
  });
  await Promise.all(requests);
  durations.sort((a, b) => a - b);
  expect(durations[Math.floor(durations.length * 0.95)]).toBeLessThan(5_000);
  await coach.auth.signOut();
});
