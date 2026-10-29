import { PageHero } from '../../shared/page-hero/page-hero';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AcademyFacade } from '../../core/state/academy.facade';
import { AsyncState } from '../../shared/async-state/async-state';
import { ToastService } from '../../shared/toast/toast.service';
import { AttendanceWhatsApp } from '../../core/services/whatsapp.service';

import { WhatsappAction } from '../../shared/whatsapp-action/whatsapp-action';

@Component({
  selector: 'app-manual-check-in-page',
  imports: [PageHero, FormsModule, RouterLink, AsyncState, WhatsappAction],
  templateUrl: './manual-check-in-page.html',
  styleUrl: './manual-check-in-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManualCheckInPage implements OnInit {
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly whatsappData = signal<AttendanceWhatsApp | null>(null);
  ngOnInit(): void {
    void this.store.loadAttendanceWorkspace();
  }
  protected readonly store = inject(AcademyFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly isCheckout = this.route.snapshot.data['attendanceMode'] === 'out';
  protected readonly query = signal('');
  protected readonly selectedId = signal('');
  protected readonly message = signal('');
  private readonly toastFeedback = effect(() => {
    const message = this.message();
    if (this.error()) this.toast.show(this.error(), 'error');
    else if (message) this.toast.show(message, 'success');
  });
  protected readonly rows = computed(() => {
    const q = this.query().toLowerCase();
    return this.store
      .activeEnrollmentRows()
      .filter((r) => !q || `${r.studentName} ${r.studentId}`.toLowerCase().includes(q));
  });
  protected readonly selected = computed(() => this.rows().find((r) => r.id === this.selectedId()));
  protected readonly recent = computed(() =>
    this.store
      .activeEnrollmentRows()
      .filter((r) => r.attendance?.checkInAt)
      .slice(0, 5),
  );
  protected readonly todaySummary = computed(() => {
    const rows = this.store.activeEnrollmentRows();
    const recorded = rows.filter((row) => row.attendance);
    const present = recorded.filter(
      (row) => row.attendance?.status === 'present' || row.attendance?.status === 'checked-out',
    ).length;
    const late = recorded.filter((row) => row.attendance?.status === 'late').length;
    return { present, late, absent: Math.max(0, rows.length - present - late), total: rows.length };
  });
  protected select(id: string) {
    this.selectedId.set(id);
  }
  protected retry(): void {
    this.error.set('');
    void this.store.loadAttendanceWorkspace();
  }
  protected initials(name: string) {
    return name
      .split(' ')
      .map((x) => x[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  protected code(id: string) {
    return id.replace('student-', 'STU-').toUpperCase();
  }
  protected async submitAttendance(): Promise<void> {
    const row = this.selected();
    if (!row || this.saving()) return;
    this.error.set('');
    this.message.set('');
    this.whatsappData.set(null);
    if (this.isCheckout && !row.attendance?.checkInAt) {
      this.error.set('Student must be checked in before checking out.');
      return;
    }
    this.saving.set(true);
    try {
      if (this.isCheckout) await this.store.checkOut(row.attendance!.id);
      else await this.store.checkIn(row.studentId, row.batchId);

      this.whatsappData.set(null);
      try {
        this.whatsappData.set(await this.store.attendanceWhatsApp(row.studentId, row.batchId, this.isCheckout ? 'check_out' : 'check_in'));
      } catch (error) {
        this.error.set('Attendance saved. ' + (error instanceof Error ? error.message : 'WhatsApp preparation failed.'));
        console.error('Attendance WhatsApp preparation failed', error);
      }

      this.message.set(row.studentName + (this.isCheckout ? ' checked out successfully.' : ' checked in successfully.'));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Attendance could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

}
