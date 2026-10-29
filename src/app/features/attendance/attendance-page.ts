import { AttendanceViewNavigation } from './attendance-view-navigation';
import { PageHero } from '../../shared/page-hero/page-hero';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { WhatsappService, AttendanceWhatsApp } from '../../core/services/whatsapp.service';
import { NotificationTemplatesService } from '../../core/supabase/domain-services';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademyFacade } from '../../core/state/academy.facade';
import { AsyncState } from '../../shared/async-state/async-state';
import { ToastService } from '../../shared/toast/toast.service';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';

@Component({
  selector: 'app-attendance-page',
  imports: [AttendanceViewNavigation, PageHero, StatusBadge, RouterLink, AsyncState, SummaryMetricCard],
  templateUrl: './attendance-page.html',
  styleUrl: './attendance-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePage implements OnInit {
  ngOnInit(): void {
    void this.store.loadAttendanceWorkspace();
  }
  protected readonly store = inject(AcademyFacade);
  private readonly interactionDialog = inject(InteractionDialogService);
  private readonly toast = inject(ToastService);
  private readonly whatsapp = inject(WhatsappService);
  private readonly notificationTemplates = inject(NotificationTemplatesService);
  protected readonly error = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly whatsappData = signal<AttendanceWhatsApp | null>(null);
  private readonly toastFeedback = effect(() => {
    const err = this.error();
    const msg = this.message();
    if (err) this.toast.show(err, 'error');
    else if (msg) this.toast.show(msg, 'success');
  });
  protected readonly metrics = computed(() => {
    const total = this.store.activeEnrollmentRows().length;
    const present = this.store
      .activeEnrollmentRows()
      .filter((row) => row.attendance && row.attendance.status !== 'absent').length;
    const late = this.store
      .activeEnrollmentRows()
      .filter((row) => row.attendance?.status === 'late').length;
    return {
      total,
      present,
      absent: Math.max(0, total - present),
      late,
      rate: total ? ((present / total) * 100).toFixed(2) : '0.00',
    };
  });
  protected readonly recent = computed(() => {
    return this.store
      .activeEnrollmentRows()
      .filter((row) => !!row.attendance?.checkInAt)
      .slice(0, 5);
  });
  protected percentage(value: number): string {
    const total = this.metrics().total;
    return total ? ((value / total) * 100).toFixed(2) : '0.00';
  }
  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  protected checkIn(studentId: string, batchId: string): void {
    this.run(() => this.store.checkIn(studentId, batchId), 'Student checked in.');
    // Prepare WhatsApp data after check-in
    const student = this.store.students().find((s) => s.id === studentId);
    const parentId = student?.parentId as string | undefined;
    const parent = parentId ? this.store.parents().find((p) => p.id === parentId) : undefined;
    if (parent) {
      const studentRow = this.store.activeEnrollmentRows().find((r) => r.studentId === studentId);
      if (studentRow) {
        const timestamp = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date());
        this.whatsappData.set({
          studentName: studentRow.studentName,
          batchName: studentRow.batchName,
          parentPhone: parent.whatsapp,
          action: 'check_in' as const,
          timestamp,
        });
        this.openWhatsAppConfirmationDialog(
          'student_check_in_whatsapp',
          studentRow.studentName,
          'check_in',
          timestamp,
          parent.whatsapp,
        );
      }
    }
  }
  protected checkOut(attendanceId: string): void {
    this.run(() => this.store.checkOut(attendanceId), 'Student checked out.');
    const record = this.store.attendance().find((item) => item.id === attendanceId);
    if (record) {
      const student = this.store.students().find((s) => s.id === record.studentId);
      const parentId = student?.parentId as string | undefined;
      const parent = parentId ? this.store.parents().find((p) => p.id === parentId) : undefined;
      if (parent) {
        const studentRow = this.store.activeEnrollmentRows().find((r) => r.studentId === record.studentId);
        if (studentRow) {
          const timestamp = record.checkOutAt
            ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date())
            : new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date());
          this.whatsappData.set({
            studentName: studentRow.studentName,
            batchName: studentRow.batchName,
            parentPhone: parent.whatsapp,
            action: 'check_out' as const,
            timestamp,
          });
          this.openWhatsAppConfirmationDialog(
            'student_check_out_whatsapp',
            studentRow.studentName,
            'check_out',
            timestamp,
            parent.whatsapp,
          );
        }
      }
    }
  }
  protected retryFor(attendanceId: string): void {
    const operation = this.store.attendanceOutbox
      .operations()
      .find((item) => attendanceId === `local-${item.id}` || attendanceId === item.attendanceId);
    if (operation) void this.store.attendanceOutbox.retry(operation.id);
  }
  protected useServerState(attendanceId: string): void {
    const operation = this.store.attendanceOutbox
      .operations()
      .find((item) => attendanceId === `local-${item.id}` || attendanceId === item.attendanceId);
    if (operation) void this.store.attendanceOutbox.discard(operation.id);
    void this.store.loadAttendanceWorkspace();
  }
  private async run(action: () => Promise<void>, message: string): Promise<void> {
    this.error.set('');
    try {
      await action();
      this.message.set(message);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Attendance could not be updated.');
    }
  }

  protected sendWhatsApp(): void {
    if (!this.whatsappData()) return;
    void this.confirmAndOpenWhatsApp(
      this.whatsappData()!,
      'send_whatsapp_from_card',
    );
  }

  protected openWhatsAppConfirmationDialog(
    templateKey: string,
    studentName: string,
    action: 'check_in' | 'check_out',
    timestamp: string,
    parentPhone: string,
  ): void {
    const data: AttendanceWhatsApp = {
      studentName,
      action,
      parentPhone,
      batchName: this.whatsappData()?.batchName ?? studentName,
      timestamp,
      academyName: 'Turf Cricket Academy',
      timezone: 'Asia/Kolkata',
    };
    void this.confirmAndOpenWhatsApp(data, templateKey);
  }

  private async confirmAndOpenWhatsApp(
    data: AttendanceWhatsApp,
    templateKey: string,
  ): Promise<void> {
    const phone = data.parentPhone?.trim();
    if (!phone) {
      this.toast.show('No parent phone number found.', 'error');
      return;
    }

    try {
      const message = await this.resolveAttendanceWhatsAppMessage(data, templateKey);
      const confirmed = await this.interactionDialog.confirm(
        `WhatsApp notification prepared for ${data.studentName} (${data.action}):\n\nPreview:\n${message}\n\nParent phone: ${phone}\n\nDo you want to open WhatsApp and send this message?`,
        'WhatsApp Confirmation',
      );
      if (!confirmed) return;
      const link = this.whatsapp.linkForMessage(phone, message);
      window.open(link, '_blank', 'noopener,noreferrer');
      this.toast.show('WhatsApp opened. Review message and press Send.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'WhatsApp message could not be prepared.';
      this.toast.show(message, 'error');
    }
  }

  private async resolveAttendanceWhatsAppMessage(
    data: AttendanceWhatsApp,
    templateKey: string,
  ): Promise<string> {
    const keys = [
      templateKey,
      templateKey === 'student_check_in_whatsapp' ? 'attendance_check_in' : null,
      templateKey === 'student_check_out_whatsapp' ? 'attendance_check_out' : null,
    ].filter((key): key is string => !!key);

    for (const key of keys) {
      const template = await this.notificationTemplates.byKey(key, 'whatsapp');
      if (!template?.body.trim()) continue;
      return this.renderAttendanceTemplate(template.body, data);
    }

    return this.whatsapp.createMessage(data);
  }

  private renderAttendanceTemplate(body: string, data: AttendanceWhatsApp): string {
    const date = new Date(data.timestamp);
    const timeZone = data.timezone ?? 'Asia/Kolkata';
    const sessionDate = Number.isNaN(date.getTime())
      ? data.timestamp
      : new Intl.DateTimeFormat('en-IN', { timeZone, dateStyle: 'medium' }).format(date);
    const eventTime = Number.isNaN(date.getTime())
      ? data.timestamp
      : new Intl.DateTimeFormat('en-IN', { timeZone, timeStyle: 'short' }).format(date);

    return body.replace(/\{([a-z0-9_]+)\}/g, (placeholder, key: string) => {
      const replacements: Record<string, string> = {
        student_name: data.studentName,
        parent_name: data.parentName?.trim() || '',
        batch_name: data.batchName || 'Turf Cricket Academy',
        event_time: eventTime,
        session_date: sessionDate,
      };
      return replacements[key] ?? placeholder;
    });
  }

  protected async openWhatsAppNow(
    templateKey: string,
    studentName: string,
    action: 'check_in' | 'check_out',
    timestamp: string,
    parentPhone: string,
  ): Promise<void> {
    const batchName = this.whatsappData()?.batchName ?? studentName;
    await this.confirmAndOpenWhatsApp(
      {
        studentName,
        action,
        parentPhone,
        batchName,
        timestamp,
        academyName: 'Turf Cricket Academy',
        timezone: 'Asia/Kolkata',
      },
      templateKey,
    );
  }
}