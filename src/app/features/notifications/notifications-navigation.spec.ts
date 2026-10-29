import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationsService } from '../../core/supabase/domain-services';
import { DialogService } from '../../shared/dialog/dialog.service';
import { NotificationsPage } from './notifications-page';
import { notificationRedirect } from './notification-query';

describe('Notification management navigation', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('loads legacy bookmarks, updates URL without duplicate requests and opens full details', async () => {
    const history = vi.fn().mockResolvedValue([
      {
        id: 'event-1',
        occurred_at: '2026-10-23T10:00:00Z',
        actor_id: null,
        event_type: 'delivery_changed',
        evidence: {
          before: { status: 'sending' },
          after: {
            status: 'failed',
            retry_count: 1,
            delivery_uncertain: true,
            failure_reason: 'Provider timeout',
          },
        },
      },
    ]);
    const page = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'notice-1',
          subject: 'Attendance update',
          body: 'Full message for the parent.',
          recipient: 'Parent',
          student: { full_name: 'Aarav Sharma' },
          channel: 'whatsapp',
          status: 'failed',
          created_at: '2026-10-22T10:00:00Z',
        },
      ],
      total: 1,
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'notifications/failed',
            pathMatch: 'full',
            redirectTo: notificationRedirect({ status: 'failed' }),
          },
          { path: 'notifications', component: NotificationsPage },
        ]),
        {
          provide: NotificationsService,
          useValue: {
            page,
            history,
            counts: vi.fn().mockResolvedValue({ all: 1, delivered: 0, pending: 0, failed: 1 }),
            deliveryAction: vi.fn().mockResolvedValue({ channels: ['in_app'] }),
          },
        },
        { provide: AuthService, useValue: { role: () => 'admin' } },
      ],
    });
    const harness = await RouterTestingHarness.create('/notifications/failed?channel=whatsapp');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).url).toContain('status=failed');
    expect(
      harness.routeNativeElement!.querySelector('app-page-hero')!.nextElementSibling!.tagName,
    ).toBe('APP-NOTIFICATION-SECTION-NAV');
    expect(
      harness.routeNativeElement!.querySelector(
        'app-notification-section-nav a[aria-current="page"]',
      )!.textContent,
    ).toContain('Management');

    const channel: HTMLSelectElement = harness.routeNativeElement!.querySelector(
      '.notification-filters select',
    )!;
    channel.value = 'email';
    channel.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toContain('channel=email');
    expect(page).toHaveBeenCalledTimes(2);

    await harness.navigateByUrl('/notifications?channel=whatsapp&status=failed');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(channel.value).toBe('whatsapp');
    expect(page).toHaveBeenCalledTimes(3);
    expect(
      harness.routeNativeElement!.querySelector('.notification-table-row')!.textContent,
    ).toContain('Aarav Sharma');
    const student: HTMLInputElement = harness.routeNativeElement!.querySelector(
      'input[placeholder="Search linked student"]',
    )!;
    student.value = 'Aarav';
    student.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toContain('student=Aarav');
    expect(page).toHaveBeenCalledTimes(4);

    const detail = Array.from(harness.routeNativeElement!.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === 'View details',
    )!;
    detail.click();
    expect(TestBed.inject(DialogService).active()?.config.message).toContain(
      'Full message for the parent.',
    );
    TestBed.inject(DialogService).closeAll();

    const historyButton = Array.from(harness.routeNativeElement!.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === 'View history',
    )!;
    historyButton.click();
    await harness.fixture.whenStable();
    expect(history).toHaveBeenCalledWith('notice-1');
    const historyMessage = TestBed.inject(DialogService).active()?.config.message;
    expect(historyMessage).toContain('sending → failed');
    expect(historyMessage).toContain('Provider timeout');
    expect(historyMessage).toContain('reconciliation required');
    TestBed.inject(DialogService).closeAll();
    history.mockRejectedValueOnce(new Error('History unavailable'));
    historyButton.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('History unavailable');
    expect(historyButton.disabled).toBe(false);
    expect(TestBed.inject(DialogService).active()).toBeNull();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const copy = Array.from(harness.routeNativeElement!.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === 'Copy message',
    )!;
    copy.click();
    await harness.fixture.whenStable();
    expect(writeText).toHaveBeenCalledWith('Full message for the parent.');
    writeText.mockRejectedValueOnce(new Error('Permission denied'));
    copy.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Copy failed.');

    const clear = Array.from(harness.routeNativeElement!.querySelectorAll('button')).find(
      (button) => button.textContent === 'Clear all filters',
    )!;
    clear.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/notifications');
    expect(student.value).toBe('');
    expect(page).toHaveBeenCalledTimes(5);
    const studentId = '00000000-0000-0000-0000-000000000001';
    const recipientId = 'parent:00000000-0000-0000-0000-000000000002';
    await harness.navigateByUrl(
      `/notifications?studentId=${studentId}&recipientId=${recipientId}&batchId=unlinked`,
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.mock.calls.at(-1)?.[6]).toEqual(
      expect.objectContaining({ studentId, recipientId, batchId: 'unlinked' }),
    );
    const exactStudent = harness.routeNativeElement!.querySelector(
      'app-notification-entity-filter[kind="student"] select',
    ) as HTMLSelectElement;
    expect(exactStudent.value).toBe(studentId);
    clear.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/notifications');
    expect(exactStudent.value).toBe('');
  });
});
