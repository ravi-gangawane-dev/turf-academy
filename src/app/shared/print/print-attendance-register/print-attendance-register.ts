import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrintAttendanceRegisterDocument } from '../print-document.models';
import { PrintPage, printPages } from '../print-page';
import { PrintPageFooter } from '../print-page-footer/print-page-footer';

/** The first sheet carries the batch summary and totals, so it holds fewer rows. */
const FIRST_PAGE_ROWS = 14;
const NEXT_PAGE_ROWS = 26;

const STATUS_LABELS: Readonly<Record<string, string>> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  checked_out: 'Checked out',
  not_recorded: 'Not recorded',
};

const STATUS_TONES: Readonly<Record<string, string>> = {
  present: 'present',
  late: 'late',
  absent: 'absent',
  checked_out: 'out',
  not_recorded: 'unmarked',
};

@Component({
  selector: 'app-print-attendance-register',
  imports: [DatePipe, PrintPageFooter],
  templateUrl: './print-attendance-register.html',
  styleUrl: './print-attendance-register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintAttendanceRegister {
  readonly register = input.required<PrintAttendanceRegisterDocument>();

  protected readonly pages = computed<readonly PrintPage<PrintAttendanceRegisterDocument['rows'][number]>[]>(
    () => printPages(this.register().rows, FIRST_PAGE_ROWS, NEXT_PAGE_ROWS),
  );

  protected statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status.replaceAll('_', ' ');
  }

  protected statusTone(status: string): string {
    return STATUS_TONES[status] ?? 'unmarked';
  }

  /** Date-only values must be pinned to UTC or a positive timezone shifts them a day back. */
  protected formatDay(value: string): string {
    return this.formatDate(value, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatLongDay(value: string): string {
    return this.formatDate(value, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  private formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
    const date = new Date(`${String(value ?? '').slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return value || '—';
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(date);
  }
}
