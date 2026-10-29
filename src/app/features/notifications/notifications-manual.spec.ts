import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationsService } from '../../core/supabase/domain-services';
import { DialogService } from '../../shared/dialog/dialog.service';
import { NotificationsPage } from './notifications-page';

describe('Manual notification activity', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  async function setup(state = '') {
    const row = {
      id: 'notice',
      subject: 'Attendance',
      recipient: '9876543210',
      body: 'Saved attendance message',
      channel: 'whatsapp',
      status: 'queued',
      manual_state: state,
      created_at: '2026-10-23T10:00:00Z',
    };
    const manualWhatsApp = vi.fn(async (_id: string, action: string) => {
      row.manual_state =
        action === 'request'
          ? 'launch_requested'
          : action === 'confirm'
            ? 'confirmed_sent'
            : 'cancelled';
      return { ...row };
    });
    const deliveryAction = vi.fn().mockResolvedValue({ channels: ['whatsapp'] });
    TestBed.configureTestingModule({
      imports: [NotificationsPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
        { provide: AuthService, useValue: { role: () => 'admin' } },
        {
          provide: NotificationsService,
          useValue: {
            manualWhatsApp,
            deliveryAction,
            page: vi.fn(async () => ({ rows: [{ ...row }], total: 1 })),
            counts: vi.fn().mockResolvedValue({ all: 1, delivered: 0, pending: 0, failed: 0 }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(NotificationsPage);
    const flush = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    fixture.detectChanges();
    await flush();
    const click = (label: string) => {
      const button = [...fixture.nativeElement.querySelectorAll('button')].find(
        (button: HTMLButtonElement) => button.textContent?.trim() === label,
      );
      expect(button, label).toBeTruthy();
      button.click();
    };
    return {
      fixture,
      flush,
      click,
      manualWhatsApp,
      deliveryAction,
      dialogs: TestBed.inject(DialogService),
    };
  }

  it('persists before opening, opens only on a direct action, and keeps confirmation separate', async () => {
    const { fixture, flush, click, manualWhatsApp, deliveryAction, dialogs } = await setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    click('Manual WhatsApp');
    expect(manualWhatsApp).not.toHaveBeenCalled();
    dialogs.close('confirm');
    await flush();
    expect(manualWhatsApp).toHaveBeenCalledWith('notice', 'request');
    expect(open).not.toHaveBeenCalled();
    expect(dialogs.active()?.config.message).toContain('Saved attendance message');
    await dialogs.runAction(dialogs.active()!, 'confirm');
    expect(open).toHaveBeenCalledWith(
      'https://wa.me/919876543210?text=Saved%20attendance%20message',
      '_blank',
      'noopener,noreferrer',
    );
    dialogs.close('confirm');
    await flush();
    expect(fixture.nativeElement.textContent).toContain('Delivery unknown');
    expect(fixture.nativeElement.textContent).not.toContain('Send queued message');
    click('Confirm sent');
    dialogs.close('confirm');
    await flush();
    expect(manualWhatsApp).toHaveBeenLastCalledWith('notice', 'confirm');
    expect(fixture.nativeElement.textContent).toContain('confirmed sent');
    expect(deliveryAction).toHaveBeenCalledTimes(1); // Configuration only, never provider send.
  });

  it('does not persist or open on preview cancellation and does not open on save failure', async () => {
    const { flush, click, manualWhatsApp, dialogs, fixture } = await setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    click('Manual WhatsApp');
    dialogs.close('cancel');
    await flush();
    expect(manualWhatsApp).not.toHaveBeenCalled();
    manualWhatsApp.mockRejectedValueOnce(new Error('Recipient opted out'));
    click('Manual WhatsApp');
    dialogs.close('confirm');
    await flush();
    expect(open).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Recipient opted out');
  });

  it('restores requested activity and records cancellation without asserting delivery', async () => {
    const { click, dialogs, flush, fixture, manualWhatsApp } = await setup('launch_requested');
    expect(fixture.nativeElement.textContent).toContain('Reopen WhatsApp');
    click('Cancel activity');
    dialogs.close('confirm');
    await flush();
    expect(manualWhatsApp).toHaveBeenCalledWith('notice', 'cancel');
    expect(fixture.nativeElement.textContent).toContain('Manual: cancelled');
    expect(fixture.nativeElement.textContent).not.toContain('Reopen WhatsApp');
    expect(fixture.nativeElement.textContent).not.toContain('Send queued message');
  });
});
