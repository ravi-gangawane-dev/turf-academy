import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrintPage, printPages } from '../print-page';
import { PrintPageFooter } from '../print-page-footer/print-page-footer';
import { PrintTableDocument, PrintTableCell } from '../print-document.models';

/** First sheet carries more chrome, so it holds fewer rows than continuation sheets. */
const FIRST_PAGE_ROWS = 22;
const NEXT_PAGE_ROWS = 32;

@Component({
  selector: 'app-print-table',
  imports: [DatePipe, PrintPageFooter],
  templateUrl: './print-table.html',
  styleUrl: './print-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintTable {
  readonly table = input.required<PrintTableDocument>();

  protected readonly pages = computed<readonly PrintPage<Readonly<Record<string, PrintTableCell>>>[]>(
    () => printPages(this.table().rows, FIRST_PAGE_ROWS, NEXT_PAGE_ROWS),
  );

  protected cell(value: PrintTableCell): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }
}
