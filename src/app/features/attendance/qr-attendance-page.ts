import { AttendanceViewNavigation } from './attendance-view-navigation';
import { PageHero } from '../../shared/page-hero/page-hero';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { attendanceTimestamp } from '../../core/supabase/attendance-timestamp';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { QrIdentity } from '../../core/models/academy.model';
import { AcademyFacade } from '../../core/state/academy.facade';
import { ToastService } from '../../shared/toast/toast.service';
import { AttendanceWhatsApp } from '../../core/services/whatsapp.service';

import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import { WhatsappAction } from '../../shared/whatsapp-action/whatsapp-action';

@Component({
  selector: 'app-qr-attendance-page',
  imports: [AttendanceViewNavigation, PageHero, DatePipe, FormsModule, RouterLink, WhatsappAction, ModalFocus],
  templateUrl: './qr-attendance-page.html',
  styleUrl: './qr-attendance-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrAttendancePage implements OnDestroy, OnInit {
  ngOnInit(): void {
    void this.store.loadAttendanceWorkspace();
  }
  protected readonly store = inject(AcademyFacade);
  private readonly toast = inject(ToastService);
  protected readonly today = new Date();
  protected readonly whatsappDialogOpen = signal(false);
  private destroyed = false;

  protected openWhatsAppDialog(): void {
    if (!this.destroyed && this.whatsappUpdates().length) this.whatsappDialogOpen.set(true);
  }
  protected readonly checkInQuery = signal('');
  protected readonly checkOutQuery = signal('');
  protected readonly selectedIn = signal<readonly string[]>([]);
  protected readonly selectedOut = signal<readonly string[]>([]);
  protected readonly saving = signal(false);
  protected readonly whatsappUpdates = signal<readonly {
    key: string; studentId: string; studentName: string;
    message: AttendanceWhatsApp | null; error: string;
  }[]>([]);
  protected readonly cameraFacing = signal<'user' | 'environment'>('user');
  protected readonly busy = computed(() => this.saving() || this.resolving() || this.whatsappDialogOpen());
  protected readonly availableRows = computed(() =>
    this.store
      .activeEnrollmentRows()
      .filter((row) => !row.attendance?.checkInAt && this.matches(row, this.checkInQuery())),
  );
  protected readonly insideRows = computed(() =>
    this.store
      .activeEnrollmentRows()
      .filter(
        (row) =>
          row.attendance?.checkInAt &&
          !row.attendance.checkOutAt &&
          this.matches(row, this.checkOutQuery()),
      ),
  );
  protected readonly summary = computed(() => {
    const rows = this.store.activeEnrollmentRows();
    return [
      {
        label: 'Present',
        value: rows.filter(
          (r) => r.attendance && ['present', 'checked-out'].includes(r.attendance.status),
        ).length,
        icon: 'pi-users',
        tone: 'green',
      },
      {
        label: 'Absent',
        value: rows.filter((r) => r.attendance?.status === 'absent').length,
        icon: 'pi-user-minus',
        tone: 'rose',
      },
      {
        label: 'Late',
        value: rows.filter((r) => r.attendance?.status === 'late').length,
        icon: 'pi-clock',
        tone: 'amber',
      },
      {
        label: 'Not marked',
        value: rows.filter((r) => !r.attendance).length,
        icon: 'pi-list',
        tone: 'violet',
      },
    ];
  });
  private matches(
    row: { studentName: string; studentId: string; batchName: string },
    query: string,
  ): boolean {
    return `${row.studentName} ${row.studentId} ${row.batchName}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  }
  protected toggleSelection(id: string, mode: 'in' | 'out'): void {
    if (this.busy()) return;
    const selected = mode === 'in' ? this.selectedIn : this.selectedOut;
    selected.update((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  }
  protected changeQuery(value: string, mode: 'in' | 'out'): void {
    (mode === 'in' ? this.checkInQuery : this.checkOutQuery).set(value);
    (mode === 'in' ? this.selectedIn : this.selectedOut).set([]);
  }
  protected displayTime(value?: string): string | null {
    return attendanceTimestamp(this.today.toISOString().slice(0, 10), value);
  }
  protected async markSelected(mode: 'in' | 'out'): Promise<void> {
    if (this.busy() || this.store.loading() || this.store.apiError()) return;
    const selection = mode === 'in' ? this.selectedIn : this.selectedOut;
    const rows = (mode === 'in' ? this.availableRows() : this.insideRows()).filter((row) =>
      selection().includes(row.id),
    );
    if (!rows.length) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.identity.set(null);
    this.whatsappDialogOpen.set(false);
    this.whatsappUpdates.set([]);
    let completed = 0;
    try {
      for (const row of rows) {
        if (mode === 'in') await this.store.checkIn(row.studentId, row.batchId);
        else await this.store.checkOut(row.attendance!.id);
        completed++;
        selection.update((ids) => ids.filter((id) => id !== row.id));
        await this.prepareWhatsApp(row.studentId, row.batchId, mode === 'in' ? 'check_in' : 'check_out', row.studentName);
      }

      this.message.set(`${completed} student${completed === 1 ? '' : 's'} checked ${mode} successfully.`);
    } catch (error) {
      this.error.set(
        `${completed ? `${completed} saved. ` : ''}${error instanceof Error ? error.message : 'Attendance could not be saved.'} Remaining selections have been kept.`,
      );
    } finally {
      this.saving.set(false);
      this.openWhatsAppDialog();
    }
  }
  protected async switchCamera(): Promise<void> {
    if (this.cameraStarting() || this.busy()) return;
    const restart = this.cameraActive();
    await this.stopCamera();
    this.cameraFacing.update((value) => (value === 'user' ? 'environment' : 'user'));
    if (restart) await this.startCamera();
  }
  private scanner?: import('html5-qrcode').Html5Qrcode;
  private readonly scannerElements = new WeakMap<import('html5-qrcode').Html5Qrcode, HTMLElement>();
  private cameraStartObserver?: MutationObserver;
  private cameraSession = 0;
  protected readonly cameraStarting = signal(false);
  protected readonly cameraActive = signal(false);
  protected readonly resolving = signal(false);
  protected readonly identity = signal<QrIdentity | null>(null);
  protected readonly error = signal('');
  protected readonly message = signal('');
  private readonly toastFeedback = effect(() => {
    const error = this.error();
    const message = this.message();
    if (error) this.toast.show(error, 'error');
    else if (message) this.toast.show(message, 'success');
  });
  protected async startCamera(): Promise<void> {
    if (this.cameraStarting() || this.cameraActive() || this.busy()) return;
    const session = ++this.cameraSession;
    this.cameraStarting.set(true);
    this.error.set('');
    this.message.set('');
    let scanner: import('html5-qrcode').Html5Qrcode | undefined;
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera capture is not supported by this browser.');
      }
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error('Camera access requires a secure connection (HTTPS or localhost).');
      }
      const { Html5Qrcode } = await import('html5-qrcode');
      if (session !== this.cameraSession) return;
      const reader = document.getElementById('qr-reader');
      if (reader && typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(() => {
          if (session !== this.cameraSession) {
            reader.querySelectorAll('video').forEach((video) => {
              const source = video.srcObject;
              if (source instanceof MediaStream) {
                source.getTracks().forEach((track) => track.stop());
              }
            });
            observer.disconnect();
            if (this.cameraStartObserver === observer) this.cameraStartObserver = undefined;
          }
        });
        observer.observe(reader, { childList: true, subtree: true });
        this.cameraStartObserver = observer;
      }
      scanner = new Html5Qrcode('qr-reader', { verbose: false });
      if (reader) this.scannerElements.set(scanner, reader);
      this.scanner = scanner;
      await scanner.start(
        { facingMode: this.cameraFacing() },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (code) => void this.resolve(code),
        () => undefined,
      );
      this.cameraStartObserver?.disconnect();
      this.cameraStartObserver = undefined;
      if (session !== this.cameraSession) {
        await this.releaseScanner(scanner);
        return;
      }
      this.cameraActive.set(true);
    } catch (error) {
      this.cameraStartObserver?.disconnect();
      this.cameraStartObserver = undefined;
      if (session === this.cameraSession) {
        this.error.set(this.cameraErrorMessage(error));
      }
      if (scanner) await this.releaseScanner(scanner);
    } finally {
      if (session === this.cameraSession) this.cameraStarting.set(false);
    }
  }

  protected async stopCamera(): Promise<void> {
    ++this.cameraSession;
    const wasStarting = this.cameraStarting();
    this.cameraStarting.set(false);
    this.cameraActive.set(false);
    const scanner = this.scanner;
    this.scanner = undefined;
    if (scanner && !wasStarting) await this.releaseScanner(scanner);
  }

  private async releaseScanner(scanner: import('html5-qrcode').Html5Qrcode): Promise<void> {
    let cleanupError: unknown;
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch (error) {
      cleanupError = error;
      if (typeof document !== 'undefined') {
        const source = document.querySelector<HTMLVideoElement>('#qr-reader video')?.srcObject;
        if (typeof MediaStream !== 'undefined' && source instanceof MediaStream) {
          source.getTracks().forEach((track) => track.stop());
        }
      }
    } finally {
      // start() can resolve before the video starts playing, when isScanning is
      // still false. Retain the original element so a detached page's stream is
      // also stopped before clear() removes the video.
      this.scannerElements.get(scanner)?.querySelectorAll('video').forEach((video) => {
        const source = video.srcObject;
        if (typeof MediaStream !== 'undefined' && source instanceof MediaStream) {
          source.getTracks().forEach((track) => track.stop());
        }
      });
      this.scannerElements.delete(scanner);
      try {
        scanner.clear();
      } catch (error) {
        cleanupError ??= error;
      }
      if (this.scanner === scanner) this.scanner = undefined;
      this.cameraActive.set(false);
    }
    if (cleanupError) {
      this.error.set(
        'The camera could not be stopped cleanly. Check that it is no longer in use before scanning again.',
      );
    }
  }

  private cameraErrorMessage(reason: unknown): string {
    const errorName = reason instanceof Error || reason instanceof DOMException ? reason.name : '';
    const message = reason instanceof Error ? reason.message : String(reason ?? '');
    const detail = `${errorName} ${message}`.toLowerCase();
    if (
      detail.includes('notallowed') ||
      detail.includes('permission') ||
      detail.includes('security')
    ) {
      return 'Camera access was denied or blocked. Allow camera permission in your browser settings or enter the code manually.';
    }
    if (
      detail.includes('notfound') ||
      detail.includes('overconstrained') ||
      detail.includes('no camera')
    ) {
      return 'No compatible camera was found. Connect or enable a camera, or enter the code manually.';
    }
    if (
      detail.includes('notreadable') ||
      detail.includes('busy') ||
      detail.includes('aborterror')
    ) {
      return 'The camera is busy or unavailable. Close other apps using it, then try again or enter the code manually.';
    }
    if (detail.includes('secure connection') || detail.includes('secure context')) {
      return 'Camera access requires a secure connection (HTTPS or localhost). Enter the code manually if needed.';
    }
    if (detail.includes('not supported')) {
      return 'Camera capture is not supported by this browser. Enter the code manually instead.';
    }
    return 'The camera could not be started. Check browser permission and camera availability, or enter the code manually.';
  }

  protected async resolve(code: string): Promise<void> {
    if (this.busy()) return;
    if (!code.trim()) {
      this.error.set('Enter a student QR code.');
      return;
    }
    this.resolving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      this.identity.set(await this.store.identifyQrCode(code));
      await this.stopCamera();
    } catch (error) {
      this.identity.set(null);
      this.error.set(error instanceof Error ? error.message : 'QR code could not be identified.');
    } finally {
      this.resolving.set(false);
    }
  }

  protected async confirm(): Promise<void> {
    const identity = this.identity();
    if (!identity || this.busy() || identity.attendance?.checkOutAt) return;
    this.resolving.set(true);
    this.whatsappDialogOpen.set(false);
    this.whatsappUpdates.set([]);
    this.error.set('');
    this.message.set('');
    try {
      if (!identity.attendance?.checkInAt) {
        await this.store.checkIn(identity.student.id, identity.batch.id, 'qr');
        this.message.set(`${identity.student.name} checked in.`);
      } else if (!identity.attendance.checkOutAt) {
        await this.store.checkOut(identity.attendance.id);
        this.message.set(`${identity.student.name} checked out.`);
      }
      await this.prepareWhatsApp(identity.student.id, identity.batch.id, identity.attendance?.checkInAt ? 'check_out' : 'check_in', identity.student.name);
      this.selectedIn.set([]);
      this.selectedOut.set([]);
      this.identity.set(null);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Attendance could not be updated.');
    } finally {
      this.resolving.set(false);
      this.openWhatsAppDialog();
    }
  }

  protected async prepareSavedWhatsApp(studentId: string, batchId: string, action: 'check_in' | 'check_out', studentName: string): Promise<void> {
    if (this.busy()) return;
    this.resolving.set(true);
    this.whatsappDialogOpen.set(false);
    this.whatsappUpdates.set([]);
    try {
      await this.prepareWhatsApp(studentId, batchId, action, studentName);
      this.openWhatsAppDialog();
    } finally { this.resolving.set(false); }
  }

  private async prepareWhatsApp(studentId: string, batchId: string, action: 'check_in' | 'check_out', studentName = ''): Promise<void> {
    if (!this.store.attendanceOutbox.online()) return;
    const update = { key: `${studentId}:${action}`, studentId, studentName, message: null as AttendanceWhatsApp | null, error: '' };
    try {
      update.message = await this.store.attendanceWhatsApp(studentId, batchId, action);
      if (!update.message) update.error = 'No parent WhatsApp message is available. Review the linked parent.';
    } catch (error) {
      update.error = error instanceof Error ? error.message : 'WhatsApp preparation failed. Try again from the attendance record.';
      console.error('Attendance WhatsApp preparation failed', error);
    }
    if (this.destroyed) return;
    this.whatsappUpdates.update(updates => [...updates.filter(item => item.key !== update.key), update]);
  }

  protected reset(): void {
    this.identity.set(null);
    this.error.set('');
    this.message.set('');
  }
  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.whatsappDialogOpen.set(false);
    void this.stopCamera();
  }
}
