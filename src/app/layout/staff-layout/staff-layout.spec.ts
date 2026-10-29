import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { Permission, ROLE_PERMISSIONS } from '../../core/auth/permissions';
import { StaffRole } from '../../core/auth/auth.model';
import { AcademyFacade } from '../../core/state/academy.facade';
import { NotificationsService, ParentsService } from '../../core/supabase/domain-services';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { StorageService } from '../../core/supabase/storage.service';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { StaffLayout } from './staff-layout';

function setup(
  role: StaffRole,
  options: {
    online?: boolean;
    operations?: number;
    apiError?: string;
    configured?: boolean;
    unread?: number;
    failed?: number;
  } = {},
) {
  const session = { accessToken: 'token', user: { id: 'u1', name: 'Ravi Admin', role }, profile: { id: 'u1', role } };
  const hasPermission = (permission?: Permission) =>
    !permission || ROLE_PERMISSIONS[role].includes(permission);
  const logout = vi.fn().mockResolvedValue(undefined);
  const preferences = { load: vi.fn().mockResolvedValue(undefined) };
  const notifications = {
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    list: vi.fn().mockResolvedValue([]),
    unreadCount: vi.fn().mockResolvedValue(options.unread ?? 0),
    attentionCount: vi.fn().mockResolvedValue(options.failed ?? 0),
  };
  const parents = { getByProfile: vi.fn().mockResolvedValue({ photo_url: null }) };
  const outbox = {
    online: signal(options.online ?? true),
    operations: signal(Array.from({ length: options.operations ?? 0 })),
    syncing: signal(false),
    retry: vi.fn(),
  };
  const academy = {
    loading: signal(false),
    apiError: signal(options.apiError ?? ''),
    notifications: signal([]),
    attendanceOutbox: outbox,
    refresh: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { session: () => session, role: () => role, profile: () => session.profile, hasPermission, logout } },
      { provide: AcademyFacade, useValue: academy },
      { provide: AcademyPreferencesService, useValue: preferences },
      { provide: NotificationsService, useValue: notifications },
      { provide: ParentsService, useValue: parents },
      { provide: SupabaseClientService, useValue: { configured: options.configured ?? false, requireClient: () => ({}) } },
      { provide: StorageService, useValue: { signedUrl: vi.fn().mockResolvedValue(null) } },
    ],
  });
  const fixture = TestBed.createComponent(StaffLayout);
  fixture.detectChanges();
  return { fixture, layout: fixture.componentInstance, logout, preferences, notifications, outbox, academy };
}

const navLabels = (fixture: ComponentFixture<StaffLayout>): string[] =>
  Array.from(fixture.nativeElement.querySelectorAll('nav a') as NodeListOf<Element>).map(
    (link) => (link.textContent ?? '').trim(),
  );

describe('StaffLayout', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const { layout } = setup('admin');
    expect(layout).toBeTruthy();
  });

  it('lists the staff navigation for an administrator', async () => {
    const { fixture, layout } = setup('admin');
    await layout.ngOnInit();
    const labels = navLabels(fixture);
    expect(labels).toContain('Students');
    expect(labels).toContain('Fees');
    expect(labels).toContain('Settings');
  });

  it('lists the parent navigation and hides the global search for a parent', async () => {
    const { fixture, layout } = setup('parent');
    await layout.ngOnInit();
    const labels = navLabels(fixture);
    expect(labels).toContain('My Children');
    expect(labels).toContain('Help & Support');
    expect(labels).not.toContain('Students');
    expect(fixture.nativeElement.querySelector('input[aria-label="Search academy"]')).toBeNull();
  });

  it('lists the coach navigation for a coach', async () => {
    const { fixture, layout } = setup('coach');
    await layout.ngOnInit();
    const labels = navLabels(fixture);
    expect(labels).toContain('My Batches');
    expect(labels).toContain('My Students');
    expect(labels).not.toContain('Fees');
  });

  it('hides the entries the signed-in role cannot use', async () => {
    const { fixture, layout } = setup('receptionist');
    await layout.ngOnInit();
    const labels = navLabels(fixture);
    expect(labels).toContain('Students');
    expect(labels).not.toContain('Reports');
    expect(labels).not.toContain('Settings');
  });

  it('opens and closes the coach attendance sub-navigation', async () => {
    const { fixture, layout } = setup('coach');
    await layout.ngOnInit();
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.nav-expand');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(layout['coachAttendanceMenuOpen']()).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Correction');
  });

  it('keeps one attendance sidebar item on every attendance page', async () => {
    const { fixture } = setup('admin');
    const router = TestBed.inject(Router);
    router.resetConfig([{ path: '**', children: [] }]);
    for (const path of ['/attendance', '/attendance/check-in-out', '/attendance/history', '/attendance/calendar', '/attendance/offline-queue']) {
      await router.navigateByUrl(path);
      await fixture.whenStable();
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.sidebar a[href^="/attendance"]').length).toBe(1);
      expect(fixture.nativeElement.querySelector('.attendance-view-actions')).toBeNull();
    }
  });

  it('opens and closes the mobile navigation', async () => {
    const { fixture, layout } = setup('admin');
    await layout.ngOnInit();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.menu-button');
    button.click();
    fixture.detectChanges();
    expect(layout['menuOpen']()).toBe(true);
    expect(fixture.nativeElement.querySelector('.app-frame').classList.contains('menu-open')).toBe(true);
  });

  it('searches the academy from the top bar', async () => {
    const { fixture, layout } = setup('admin');
    await layout.ngOnInit();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[aria-label="Search academy"]');
    input.value = 'Aarav';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    layout['submitGlobalSearch']();
    expect(navigate).toHaveBeenCalledWith(['/search'], { queryParams: { q: 'Aarav' } });
  });

  it('sends a coach to the student list instead of the academy search', async () => {
    const { layout } = setup('coach');
    await layout.ngOnInit();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    layout['globalSearch'].set('Aarav');
    layout['submitGlobalSearch']();
    expect(navigate).toHaveBeenCalledWith(['/coach/students'], { queryParams: { q: 'Aarav' } });
  });

  it('ignores an empty search', async () => {
    const { layout } = setup('admin');
    await layout.ngOnInit();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    layout['globalSearch'].set('   ');
    layout['submitGlobalSearch']();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('signs out and returns to the login page', async () => {
    const { layout, logout } = setup('admin');
    await layout.ngOnInit();
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await layout['logout']();
    expect(logout).toHaveBeenCalled();
    expect(navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('warns the user when attendance changes are waiting to sync', async () => {
    const { fixture, layout } = setup('admin', { operations: 2 });
    await layout.ngOnInit();
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('2 attendance changes need attention');
  });

  it('warns the user when the portal is offline', async () => {
    const { fixture, layout } = setup('admin', { online: false });
    await layout.ngOnInit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Offline');
  });

  it('offers a retry when the academy data could not be loaded', async () => {
    const { fixture, layout, academy } = setup('admin', { apiError: 'Students could not be loaded.' });
    await layout.ngOnInit();
    fixture.detectChanges();
    const alert: HTMLElement = fixture.nativeElement.querySelector('.error-state');
    expect(alert.textContent).toContain('Students could not be loaded.');
    const retry: HTMLButtonElement = alert.querySelector('button')!;
    retry.click();
    expect(academy.refresh).toHaveBeenCalled();
  });

  it('reads the staff bell count from the failed-delivery aggregate', async () => {
    const { fixture, layout, notifications } = setup('admin', {
      configured: true,
      failed: 3,
      unread: 99,
    });
    await layout.ngOnInit();
    await layout['loadBellCount']();
    fixture.detectChanges();
    expect(notifications.attentionCount).toHaveBeenCalled();
    expect(notifications.unreadCount).not.toHaveBeenCalled();
    const bell: HTMLAnchorElement = fixture.nativeElement.querySelector('.notification-button');
    expect(bell.getAttribute('aria-label')).toBe('Notifications, 3 failed');
    expect(bell.querySelector('.count')?.textContent?.trim()).toBe('3');
  });

  it('reads the parent bell count from the unread inbox aggregate', async () => {
    const { fixture, layout, notifications } = setup('parent', {
      configured: true,
      unread: 2,
      failed: 99,
    });
    await layout.ngOnInit();
    await layout['loadBellCount']();
    fixture.detectChanges();
    expect(notifications.unreadCount).toHaveBeenCalled();
    expect(notifications.attentionCount).not.toHaveBeenCalled();
    const bell: HTMLAnchorElement = fixture.nativeElement.querySelector('.notification-button');
    expect(bell.getAttribute('aria-label')).toBe('Notifications, 2 unread');
    expect(bell.querySelector('.count')?.textContent?.trim()).toBe('2');
  });

  it('hides the count when the backend aggregate is zero', async () => {
    const { fixture, layout } = setup('coach', { configured: true, unread: 0 });
    await layout.ngOnInit();
    await layout['loadBellCount']();
    fixture.detectChanges();
    const bell: HTMLAnchorElement = fixture.nativeElement.querySelector('.notification-button');
    expect(bell.getAttribute('aria-label')).toBe('Notifications');
    expect(bell.querySelector('.count')).toBeNull();
  });

  it('keeps the bell usable when the count request fails', async () => {
    const { fixture, layout, notifications } = setup('admin', { configured: true });
    notifications.attentionCount.mockRejectedValue(new Error('offline'));
    await layout.ngOnInit();
    await layout['loadBellCount']();
    fixture.detectChanges();
    const bell: HTMLAnchorElement = fixture.nativeElement.querySelector('.notification-button');
    expect(bell).not.toBeNull();
    expect(bell.getAttribute('aria-label')).toBe('Notifications');
  });
});
