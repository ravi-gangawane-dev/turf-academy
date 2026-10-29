import { expect, test } from '@playwright/test';
import { login } from './helpers';

// Real authentication/app query path; large response fixtures, no database writes.
test('coach dashboard and schedule include records beyond former row caps', async ({ page }) => {
  const date = new Date().toLocaleDateString('en-CA');
  const offsets = { attendance_records: [] as number[], training_sessions: [] as number[] };
  for (const resource of ['attendance_records', 'training_sessions'] as const) {
    await page.route(`**/rest/v1/${resource}?*`, async route => {
      const query = new URL(route.request().url()).searchParams;
      const offset = Number(query.get('offset') ?? 0);
      offsets[resource].push(offset);
      const total = resource === 'attendance_records' ? 2401 : 1301;
      const rows = Array.from({ length: Math.min(137, total - offset) }, (_, i) => {
        const index = offset + i;
        return resource === 'attendance_records'
          ? { id: `attendance-${index}`, attendance_date: date, status: index < 2000 ? 'present' : 'absent', batch_id: 'large-batch' }
          : { id: `session-${index}`, session_date: date, start_time: '10:00:00', end_time: '11:00:00', batch_id: 'large-batch', title: `Scale session ${index}`, batch: { name: 'Scale batch' } };
      });
      await route.fulfill({ json: rows, headers: { 'Content-Range': `${offset}-${offset + rows.length - 1}/${total}` } });
    });
  }
  await login(page, 'coach@turf.local');
  await expect(page.locator('.attendance-overview dd')).toHaveText(['2000', '401', '0']);
  await expect(page.locator('.dashboard-ring strong')).toHaveText('83%');
  expect(offsets.attendance_records).toContain(2329);
  await page.goto('/coach/schedule');
  await expect(page.locator('.calendar-event').filter({ hasText: 'Scale session 1300' })).toBeVisible();
  expect(offsets.training_sessions).toContain(1233);
});
