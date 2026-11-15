import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrintBatchRosterDocument, PrintBatchRosterRow } from '../print-document.models';
import { printDateOnly } from '../print-format';
import { PrintPage, printPages } from '../print-page';
import { PrintPageFooter } from '../print-page-footer/print-page-footer';

/** Guardian contact blocks make each row tall, so fewer rows fit per sheet. */
const FIRST_PAGE_ROWS = 11;
const NEXT_PAGE_ROWS = 20;

@Component({
  selector: 'app-print-batch-roster',
  imports: [DatePipe, PrintPageFooter],
  templateUrl: './print-batch-roster.html',
  styleUrl: './print-batch-roster.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintBatchRoster {
  readonly roster = input.required<PrintBatchRosterDocument>();

  protected readonly pages = computed<readonly PrintPage<PrintBatchRosterRow>[]>(() =>
    printPages(this.roster().rows, FIRST_PAGE_ROWS, NEXT_PAGE_ROWS),
  );

  /** Date-only values must be pinned to UTC or a positive timezone shifts them a day back. */
  protected formatDay(value: string | undefined): string {
    return printDateOnly(value, this.roster().brand.currencyCode);
  }

  protected pickupLabel(canPickUp: boolean): string {
    return canPickUp ? 'Authorised for pickup' : 'Not authorised for pickup';
  }
}
