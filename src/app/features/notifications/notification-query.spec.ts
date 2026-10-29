import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, Router } from '@angular/router';
import {
  notificationQueryParams,
  notificationRedirect,
  readNotificationQuery,
} from './notification-query';

describe('Notification URL query contract', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('rejects invalid paging, sort, channel, status and impossible dates', () => {
    const query = readNotificationQuery(
      convertToParamMap({
        page: '-4',
        pageSize: '999999',
        channel: 'unknown',
        status: 'fake',
        sort: 'sql',
        direction: 'random',
        from: '2026-02-30',
        cf_createdAt: 'bad',
        studentId: 'invalid', recipientId: 'admin:bad', batchId: 'bad',
      }),
    );
    expect(query).toMatchObject({
      page: 1,
      pageSize: 5,
      channel: '',
      status: 'all',
      sort: 'createdAt',
      direction: 'desc',
      from: '',
      columns: {},
      studentId: '', recipientId: '', batchId: '',
    });
  });

  it('round-trips combined filters and normalizes reversed date ranges', () => {
    const query = readNotificationQuery(
      convertToParamMap({
        channel: 'whatsapp',
        status: 'failed',
        type: 'birthday',
        search: ' Aarav ',
        student: ' Aarav Sharma ',
        studentId: '00000000-0000-0000-0000-000000000001',
        recipientId: 'coach:00000000-0000-0000-0000-000000000002',
        batchId: 'unlinked',
        from: '2026-10-22',
        to: '2026-10-01',
        page: '3',
        pageSize: '20',
        sort: 'recipient',
        direction: 'asc',
        cf_recipient: 'Parent',
        cf_subject: 'Birthday',
        cf_unknown: 'ignored',
      }),
    );
    expect(query.from).toBe('2026-10-01');
    expect(query.to).toBe('2026-10-22');
    expect(query.search).toBe('Aarav');
    expect(query.studentName).toBe('Aarav Sharma');
    expect(query.columns).toEqual({ subject: 'Birthday', recipient: 'Parent' });
    expect(readNotificationQuery(convertToParamMap(notificationQueryParams(query)))).toEqual(query);
  });

  it.each([
    ['whatsapp', { channel: 'whatsapp' }],
    ['failed', { status: 'failed' }],
    ['delivery-status', {}],
  ])('preserves bookmarked filters when redirecting %s', async (path, preset) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: `notifications/${path}`,
            pathMatch: 'full',
            redirectTo: notificationRedirect(preset),
          },
          { path: 'notifications', children: [] },
        ]),
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(`/notifications/${path}?search=Aarav&from=2026-10-01`);
    const url = router.parseUrl(router.url);
    expect(url.root.children['primary'].segments.map((segment) => segment.path)).toEqual([
      'notifications',
    ]);
    expect(url.queryParams).toEqual({ search: 'Aarav', from: '2026-10-01', ...preset });
  });
});
