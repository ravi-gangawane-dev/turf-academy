import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AcademySettingsService } from '../../core/supabase/domain-services';
import { DialogService } from '../../shared/dialog/dialog.service';
import { AcademySettingsPage } from './academy-settings-page';
import { ToastService } from '../../shared/toast/toast.service';

describe('AcademySettingsPage WhatsApp test', () => {
  function setup(role = 'admin') {
    const api = {
      get: vi.fn().mockResolvedValue({
        academy_name: 'Test Academy',
        notification_channels: ['in_app'],
        timezone: 'Asia/Kolkata',
        currency_code: 'INR',
        attendance_grace_minutes: 10,
        fee_due_day: 10,
      }),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const toast = { error: vi.fn(), info: vi.fn(), success: vi.fn() };
    TestBed.configureTestingModule({
      imports: [AcademySettingsPage],
      providers: [
        provideRouter([]),
        { provide: AcademySettingsService, useValue: api },
        { provide: AuthService, useValue: { role: () => role } },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(AcademySettingsPage);
    const state = fixture.componentInstance;
    state['form'].controls.academyName.setValue('Test Academy');
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const dialogs = TestBed.inject(DialogService);
    const toastSpy = vi.spyOn(TestBed.inject(ToastService), 'error');
    const toastInfoSpy = vi.spyOn(TestBed.inject(ToastService), 'info');
    return { fixture, state, open, dialogs, toast, toastSpy, toastInfoSpy, api };
  }

  afterEach(() => {
    TestBed.inject(DialogService).closeAll();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('requires a test recipient and never falls back to the academy contact', async () => {
    const { state, open, dialogs, toastSpy } = setup();
    state['form'].controls.contactPhone.setValue('9876543210');
    await state['openTestWhatsAppMessage']();
    expect(toastSpy).toHaveBeenCalledWith('Enter a recipient number for the WhatsApp test.');
    expect(dialogs.active()).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it('validates the recipient before opening a confirmation', async () => {
    const { state, open, dialogs, toastSpy } = setup();
    state['testRecipient'].set('123');
    await state['openTestWhatsAppMessage']();
    expect(toastSpy).toHaveBeenCalledWith('Parent phone number is not a valid international number.');
    expect(dialogs.active()).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it('previews actual test text and opens only from the confirmed action', async () => {
    const { state, open, dialogs, toastInfoSpy, api } = setup();
    state['testRecipient'].set('9876543210');
    const pending = state['openTestWhatsAppMessage']();
    const request = dialogs.active()!;
    expect(request.config.message).toContain('+919876543210');
    expect(request.config.message).toContain('This is a test notification from Test Academy.');
    expect(open).not.toHaveBeenCalled();
    await dialogs.runAction(request, 'confirm');
    dialogs.close('confirm');
    await pending;
    expect(toastInfoSpy).toHaveBeenCalledWith('WhatsApp opening requested. Press Send in WhatsApp. Delivery is unconfirmed.');
    const url = new URL(String(open.mock.calls[0][0]));
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/919876543210');
    expect(url.searchParams.get('text')).toBe('This is a test notification from Test Academy. No attendance has been recorded by this test.');
    expect(api.save).not.toHaveBeenCalled();
  });

  it('does not launch on cancellation', async () => {
    const { state, open, dialogs } = setup();
    state['testRecipient'].set('9876543210');
    const pending = state['openTestWhatsAppMessage']();
    dialogs.close('cancel');
    await pending;
    expect(open).not.toHaveBeenCalled();
    expect(state['message']()).toBe('');
  });

  it('rejects non-admin test launches', async () => {
    const { state, open, dialogs, toastSpy } = setup('receptionist');
    state['testRecipient'].set('9876543210');
    await state['openTestWhatsAppMessage']();
    expect(toastSpy).toHaveBeenCalledWith('Only admin users can send test messages.');
    expect(open).not.toHaveBeenCalled();
    expect(dialogs.active()).toBeNull();
  });

  it('reports thrown browser launch errors without asserting success', async () => {
    const { state, open, dialogs } = setup();
    state['testRecipient'].set('9876543210');
    open.mockImplementation(() => { throw new Error('Launch blocked'); });
    const pending = state['openTestWhatsAppMessage']();
    await dialogs.runAction(dialogs.active()!, 'confirm');
    dialogs.close('confirm');
    await pending;
    expect(state['message']()).toBe('');
  });

  it('shows Audit log before Tools & Data and routes the tab to the audit log page', async () => {
    const { state } = setup();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    expect(state['sections'].indexOf('audit log')).toBe(state['sections'].indexOf('tools') - 1);
    state['setActiveSection']('audit log');
    expect(navigate).toHaveBeenCalledWith('/settings/audit-logs');
  });

  it('uses a non-submit preview button inside the settings form', async () => {
    const { fixture, state } = setup();
    state['activeSection'].set('notifications');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Preview test WhatsApp message"]');
    expect(button.type).toBe('button');
    expect(button.disabled).toBe(false);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="tel"]');
    input.value = '9876543210';
    input.dispatchEvent(new Event('input'));
    expect(state['testRecipient']()).toBe('9876543210');
  });
});
