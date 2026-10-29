import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from '../../core/supabase/domain-services';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationsPage } from './notifications-page';
import { DialogService } from '../../shared/dialog/dialog.service';

async function setup(list:()=>Promise<unknown[]>,data:Record<string,unknown>={}){
  const page=vi.fn(async(...args:unknown[])=>{const rows=(await list()).filter((value)=>{
    const row=value as Record<string,unknown>;
    const term=(args[6] as any)?.columns?.cf_templateKey;
    return !term || String(row['template_key']).includes(term);
  });return {rows,total:rows.length};});
  await TestBed.configureTestingModule({imports:[NotificationsPage],providers:[provideRouter([]),{provide:NotificationsService,useValue:{page,counts:async()=>({all:1,delivered:1,pending:0,failed:0}),deliveryAction:vi.fn().mockResolvedValue({channels:['in_app']})}},{provide:AuthService,useValue:{role:()=> 'admin'}},{provide:ActivatedRoute,useValue:{snapshot:{data},queryParamMap:of(convertToParamMap({channel:data['notificationChannel'],status:data['notificationStatus']}))}}]}).compileComponents();
  const fixture:ComponentFixture<NotificationsPage>=TestBed.createComponent(NotificationsPage);fixture.detectChanges();await fixture.whenStable();await new Promise(resolve=>setTimeout(resolve,0));fixture.detectChanges();return {fixture,page};
}
describe('NotificationsPage',()=>{
  it('does not open a late history dialog after leaving the page', async () => {
    const { fixture } = await setup(vi.fn().mockResolvedValue([]));
    let resolve!: (events: unknown[]) => void;
    Object.assign(TestBed.inject(NotificationsService), {
      history: vi.fn().mockReturnValue(new Promise(r => resolve = r)),
    });
    const info = vi.spyOn(TestBed.inject(DialogService), 'info').mockResolvedValue();
    const pending = (fixture.componentInstance as any).viewHistory({ id: 'notice', subject: 'Notice' });
    fixture.destroy();
    resolve([]);
    await pending;
    expect(info).not.toHaveBeenCalled();
  });
  it('labels missing history evidence as unknown instead of inventing zero attempts', async () => {
    const { fixture } = await setup(vi.fn().mockResolvedValue([]));
    Object.assign(TestBed.inject(NotificationsService), {
      history: vi.fn().mockResolvedValue([{ occurred_at: '2026-10-23T10:00:00Z', event_type: 'created', evidence: { after: {} } }]),
    });
    const info = vi.spyOn(TestBed.inject(DialogService), 'info').mockResolvedValue();
    await (fixture.componentInstance as any).viewHistory({ id: 'notice', subject: 'Notice' });
    expect(info.mock.calls[0][0]).toContain('Attempt count: Not recorded');
  });
  it('ignores a late history error after leaving the page', async () => {
    const { fixture } = await setup(vi.fn().mockResolvedValue([]));
    let reject!: (reason: Error) => void;
    Object.assign(TestBed.inject(NotificationsService), {
      history: vi.fn().mockReturnValue(new Promise((_resolve, fail) => reject = fail)),
    });
    const state = fixture.componentInstance as any;
    const pending = state.viewHistory({ id: 'notice', subject: 'Notice' });
    fixture.destroy();
    reject(new Error('Late network failure'));
    await pending;
    expect(state.deliveryMessage()).not.toContain('Late network failure');
  });
  it('preserves a recorded zero attempt count', async () => {
    const { fixture } = await setup(vi.fn().mockResolvedValue([]));
    Object.assign(TestBed.inject(NotificationsService), {
      history: vi.fn().mockResolvedValue([{ occurred_at: '2026-10-23T10:00:00Z', event_type: 'created', evidence: { after: { retry_count: 0 } } }]),
    });
    const info = vi.spyOn(TestBed.inject(DialogService), 'info').mockResolvedValue();
    await (fixture.componentInstance as any).viewHistory({ id: 'notice', subject: 'Notice' });
    expect(info.mock.calls[0][0]).toContain('Attempt count: 0');
  });
  it('offers retries only for eligible records and cancelling confirmation sends nothing', async () => {
    const base = { subject:'Notice', body:'Message', recipient:'Parent', channel:'whatsapp', created_at:'2026-10-22T10:00:00Z' };
    const {fixture} = await setup(vi.fn().mockResolvedValue([
      {...base,id:'failed',status:'failed'},
      {...base,id:'uncertain',status:'failed',delivery_uncertain:true},
      {...base,id:'future',status:'queued',scheduled_at:'2999-01-01T00:00:00Z'},
      {...base,id:'sent',status:'sent'},
    ]));
    const api = TestBed.inject(NotificationsService);
    vi.mocked(api.deliveryAction).mockResolvedValue({channels:['whatsapp']});
    // Configuration is asynchronous; recreate the page with configured provider availability.
    fixture.destroy();
    const configured = TestBed.createComponent(NotificationsPage);
    configured.detectChanges();
    await configured.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
    configured.detectChanges();
    const retries = [...configured.nativeElement.querySelectorAll('button')].filter(
      (button: HTMLButtonElement) => button.textContent?.trim() === 'Retry failed message');
    expect(retries).toHaveLength(1);
    expect(configured.nativeElement.textContent).not.toContain('Send queued message');
    const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(false);
    vi.mocked(api.deliveryAction).mockClear();
    retries[0].click();
    await configured.whenStable();
    expect(confirm).toHaveBeenCalled();
    expect(api.deliveryAction).not.toHaveBeenCalled();
    confirm.mockResolvedValue(true);
    retries[0].click();
    await configured.whenStable();
    expect(api.deliveryAction).toHaveBeenCalledWith('send', 'failed');
  });
  it('renders Supabase notifications and route filters',async()=>{
    const {fixture}=await setup(vi.fn().mockResolvedValue([{id:'1',subject:'Check in',body:'Arrived',recipient:'Parent',channel:'whatsapp',status:'delivered',created_at:'2026-09-16T10:00:00Z'}]),{notificationChannel:'whatsapp'});
    expect(fixture.nativeElement.textContent).toContain('Check in');
    expect(fixture.nativeElement.textContent).toContain('delivered');
    expect(fixture.nativeElement.textContent).toContain('Notifications Management');
    expect(fixture.nativeElement.querySelector('a[href="/notifications/templates"]')).not.toBeNull();
  });
  it('shows check-in and check-out attendance notifications in the activity feed',async()=>{
    const {fixture}=await setup(vi.fn().mockResolvedValue([
      {id:'checkout',subject:'Student checked out',body:'Aarav Sharma checked out at 02:40 PM.',recipient:'parent@example.test',channel:'in_app',status:'sent',created_at:'2026-10-13T09:10:00Z'},
      {id:'checkin',subject:'Student checked in',body:'Aarav Sharma checked in at 02:39 PM.',recipient:'parent@example.test',channel:'in_app',status:'sent',created_at:'2026-10-13T09:09:00Z'},
    ]));
    const text=fixture.nativeElement.textContent;
    expect(text).toContain('Student checked in');
    expect(text).toContain('Student checked out');
    expect(text).toContain('Aarav Sharma checked in');
    expect(text).toContain('Aarav Sharma checked out');
    expect(fixture.nativeElement.querySelectorAll('.notification-table-row')).toHaveLength(2);
  });
  it('renders an independent retryable error state',async()=>{
    const {fixture}=await setup(vi.fn().mockRejectedValue(new Error('Network unavailable')));
    expect(fixture.nativeElement.textContent).toContain('Notifications unavailable');
    expect(fixture.nativeElement.textContent).toContain('Network unavailable');
    expect([...fixture.nativeElement.querySelectorAll('button')].some((button:HTMLButtonElement)=>button.textContent?.includes('Try again'))).toBe(true);
  });
  it('filters the list to birthday notifications',async()=>{
    const {fixture,page}=await setup(vi.fn().mockResolvedValue([
      {id:'birthday',subject:'Happy birthday, Coach!',body:'Have a great day.',recipient:'Coach',channel:'in_app',status:'sent',template_key:'coach_birthday',created_at:'2026-10-13T10:00:00Z'},
    ]));
    const typeFilter=fixture.nativeElement.querySelector('input[aria-label="Filter type"]') as HTMLInputElement;
    typeFilter.value='birthday';
    typeFilter.dispatchEvent(new Event('input'));
    await new Promise(resolve=>setTimeout(resolve,300));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(typeFilter.value).toBe('birthday');
    expect(page.mock.calls[page.mock.calls.length-1]?.[6]).toEqual(expect.objectContaining({columns:expect.objectContaining({cf_templateKey:'birthday'})}));
    expect(fixture.nativeElement.textContent).toContain('Happy birthday, Coach!');
  });
  it('filters notifications by check-in and check-out template',async()=>{
    const {fixture,page}=await setup(vi.fn().mockResolvedValue([
      {id:'checkin',subject:'Student checked in',body:'Arrived.',recipient:'Parent',channel:'in_app',status:'sent',template_key:'attendance_check_in',created_at:'2026-10-13T09:00:00Z'},
      {id:'checkout',subject:'Student checked out',body:'Left.',recipient:'Parent',channel:'in_app',status:'sent',template_key:'attendance_check_out',created_at:'2026-10-13T10:00:00Z'},
    ]));
    const typeFilter=fixture.nativeElement.querySelector('input[aria-label="Filter type"]') as HTMLInputElement;
    typeFilter.value='attendance_check_in';
    typeFilter.dispatchEvent(new Event('input'));
    await new Promise(resolve=>setTimeout(resolve,300));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.mock.calls[page.mock.calls.length-1]?.[6]).toEqual(expect.objectContaining({columns:expect.objectContaining({cf_templateKey:'attendance_check_in'})}));
    expect(fixture.nativeElement.textContent).toContain('Student checked in');
    expect(fixture.nativeElement.textContent).not.toContain('Student checked out');
    typeFilter.value='attendance_check_out';
    typeFilter.dispatchEvent(new Event('input'));
    await new Promise(resolve=>setTimeout(resolve,300));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.mock.calls[page.mock.calls.length-1]?.[6]).toEqual(expect.objectContaining({columns:expect.objectContaining({cf_templateKey:'attendance_check_out'})}));
    expect(fixture.nativeElement.textContent).not.toContain('Student checked in');
    expect(fixture.nativeElement.textContent).toContain('Student checked out');
  });
});
