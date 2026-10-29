import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QrAttendancePage } from './qr-attendance-page';
import { AcademyFacade } from '../../core/state/academy.facade';
import { ToastService } from '../../shared/toast/toast.service';

// Verify persistence boundaries without starting a camera or touching a backend.
describe('Combined attendance workspace', () => {
  let page: any;
  let store: any;
  beforeEach(() => {
    store = {
      activeEnrollmentRows: signal([
        { id: 'one', studentId: 's1', studentName: 'First', batchId: 'b1', batchName: 'Morning' },
        { id: 'two', studentId: 's2', studentName: 'Second', batchId: 'b1', batchName: 'Morning' },
        { id: 'three', studentId: 's3', studentName: 'Inside', batchId: 'b1', batchName: 'Morning', attendance: { id: 'a3', checkInAt: '09:00', status: 'present' } },
        { id: 'four', studentId: 's4', studentName: 'Left', batchId: 'b1', batchName: 'Morning', attendance: { id: 'a4', checkInAt: '09:00', checkOutAt: '10:00', status: 'checked-out' } },
      ]),
      batches: signal([]), loading: signal(false), apiError: signal(''),
      attendanceOutbox: { online: signal(true) },
      checkIn: vi.fn().mockResolvedValue(undefined), checkOut: vi.fn().mockResolvedValue(undefined),
      attendanceWhatsApp: vi.fn().mockImplementation(async (studentId, batchId, action) => ({
        studentName: studentId, batchName: batchId, parentPhone: '+919130451715', action,
        timestamp: '2026-10-21T10:00:00Z',
      })),
    };
    TestBed.configureTestingModule({ providers: [
      { provide: AcademyFacade, useValue: store }, { provide: ToastService, useValue: { show: vi.fn() } },
    ] });
    page = TestBed.runInInjectionContext(() => new QrAttendancePage());
  });
  it('offers only eligible arrivals and currently checked-in departures', () => {
    expect(page.availableRows().map((r: any) => r.id)).toEqual(['one', 'two']);
    expect(page.insideRows().map((r: any) => r.id)).toEqual(['three']);
    page.checkInQuery.set('morning');
    expect(page.availableRows()).toHaveLength(2);
    expect(page.summary().find((m: any) => m.label === 'Absent').value).toBe(0);
    expect(page.summary().find((m: any) => m.label === 'Not marked').value).toBe(2);
  });
  it('retains failed and unattempted selections after a partial bulk failure', async () => {
    store.checkIn.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Save failed'));
    page.selectedIn.set(['one', 'two']);
    await page.markSelected('in');
    expect(page.selectedIn()).toEqual(['two']);
    expect(page.message()).toBe('');
    expect(page.error()).toContain('1 saved. Save failed');
    expect(page.saving()).toBe(false);
    expect(page.whatsappUpdates()).toHaveLength(1);
    expect(page.whatsappUpdates()[0].studentId).toBe('s1');
    expect(page.whatsappDialogOpen()).toBe(true);
  });
  it('opens one review dialog after a bulk save and keeps messages available after closing', async () => {
    page.selectedIn.set(['one', 'two']);
    await page.markSelected('in');
    expect(page.whatsappUpdates()).toHaveLength(2);
    expect(page.whatsappDialogOpen()).toBe(true);
    page.whatsappDialogOpen.set(false);
    page.openWhatsAppDialog();
    expect(page.whatsappDialogOpen()).toBe(true);
    expect(store.checkIn).toHaveBeenCalledTimes(2);
  });
  it('does not reopen the dialog when a message request completes after leaving the page', async () => {
    let resolve!: (value: unknown) => void;
    store.attendanceWhatsApp.mockReturnValueOnce(new Promise(r => resolve = r));
    const pending = page.prepareSavedWhatsApp('s1', 'b1', 'check_in', 'First');
    page.ngOnDestroy();
    resolve({ studentName: 'First', parentPhone: '9876543210', action: 'check_in' });
    await pending;
    expect(page.whatsappDialogOpen()).toBe(false);
    expect(page.whatsappUpdates()).toEqual([]);
  });
  it('prevents a second submission while a save is pending', async () => {
    let finish!: () => void;
    store.checkIn.mockImplementation(() => new Promise<void>(resolve => finish = resolve));
    page.selectedIn.set(['one']);
    const pending = page.markSelected('in');
    await page.markSelected('in');
    expect(store.checkIn).toHaveBeenCalledTimes(1);
    finish();
    await pending;
  });
  it('does not claim a saved checkout was queued if connectivity drops', async () => {
    store.attendanceOutbox.online.set(false);
    page.selectedOut.set(['three']);
    await page.markSelected('out');
    expect(store.checkOut).toHaveBeenCalledWith('a3');
    expect(page.message()).toContain('checked out successfully');
      expect(page.message()).not.toContain('queued');
    expect(store.attendanceWhatsApp).not.toHaveBeenCalled();
    expect(page.whatsappUpdates()).toEqual([]);
  });
  it('treats an absent QR record without a check-in time as an arrival', async () => {
    page.identity.set({ student: { id: 's1', name: 'First' }, batch: { id: 'b1' }, attendance: { id: 'a1', status: 'absent', checkInAt: '' } });
    await page.confirm();
    expect(store.checkIn).toHaveBeenCalledWith('s1', 'b1', 'qr');
    expect(store.checkOut).not.toHaveBeenCalled();
  });
  it('does not submit completed QR attendance again', async () => {
    page.identity.set({ student: { id: 's1' }, batch: { id: 'b1' }, attendance: { id: 'a1', checkOutAt: '10:00' } });
    await page.confirm();
    expect(store.checkIn).not.toHaveBeenCalled();
    expect(store.checkOut).not.toHaveBeenCalled();
  });
  it('prepares a separate parent message for every saved student without opening WhatsApp', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    page.selectedIn.set(['one', 'two']);
    await page.markSelected('in');
    expect(page.whatsappUpdates().map((item: any) => item.studentId)).toEqual(['s1', 's2']);
    expect(store.attendanceWhatsApp).toHaveBeenCalledWith('s2', 'b1', 'check_in');
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
  it('keeps attendance successful when parent lookup fails and continues preparing other messages', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    store.attendanceWhatsApp.mockRejectedValueOnce(new Error('No active parent is linked to this student.'));
    page.selectedIn.set(['one', 'two']);
    await page.markSelected('in');
    expect(store.checkIn).toHaveBeenCalledTimes(2);
    expect(page.whatsappUpdates()[0].error).toContain('No active parent');
    expect(page.whatsappUpdates()[1].message).not.toBeNull();
    expect(page.error()).toBe('');
    expect(page.message()).toContain('2 students checked in');
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
  it('can prepare an existing checkout again without modifying attendance', async () => {
    await page.prepareSavedWhatsApp('s3', 'b1', 'check_out', 'Inside');
    expect(store.checkIn).not.toHaveBeenCalled();
    expect(store.checkOut).not.toHaveBeenCalled();
    expect(page.whatsappUpdates()[0].message.action).toBe('check_out');
  });
});
