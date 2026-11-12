import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrintEnrollmentConfirmationDocument } from '../print-document.models';
import { PrintPageFooter } from '../print-page-footer/print-page-footer';

const ACTION_TITLES: Readonly<Record<PrintEnrollmentConfirmationDocument['action'], string>> = {
  created: 'Enrollment Confirmation',
  transferred: 'Transfer Confirmation',
  paused: 'Pause Confirmation',
  reactivated: 'Reactivation Confirmation',
  cancelled: 'Cancellation Confirmation',
};

const ACTION_TAGS: Readonly<Record<PrintEnrollmentConfirmationDocument['action'], string>> = {
  created: 'New enrollment',
  transferred: 'Batch transfer',
  paused: 'Enrollment paused',
  reactivated: 'Enrollment resumed',
  cancelled: 'Enrollment cancelled',
};

@Component({
  selector: 'app-print-enrollment-confirmation',
  imports: [DatePipe, PrintPageFooter],
  templateUrl: './print-enrollment-confirmation.html',
  styleUrl: './print-enrollment-confirmation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintEnrollmentConfirmation {
  readonly confirmation = input.required<PrintEnrollmentConfirmationDocument>();

  protected readonly title = computed(() => ACTION_TITLES[this.confirmation().action]);
  protected readonly tag = computed(() => ACTION_TAGS[this.confirmation().action]);

  /** Date-only values must be pinned to UTC or a positive timezone shifts them a day back. */
  protected formatDay(value: string | undefined): string {
    const raw = String(value ?? '').slice(0, 10);
    if (!raw) return '—';
    const date = new Date(`${raw}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  protected money(value: number): string {
    const currency = this.confirmation().brand.currencyCode || 'INR';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  }
}
