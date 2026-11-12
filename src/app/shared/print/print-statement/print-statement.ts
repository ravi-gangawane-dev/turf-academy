import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrintStatementDocument } from '../print-document.models';
import { printMoney } from '../print-format';
import { PrintPage, printPages } from '../print-page';
import { PrintPageFooter } from '../print-page-footer/print-page-footer';

/** The first sheet carries the account summary, so it holds fewer ledger rows. */
const FIRST_PAGE_ROWS = 12;
const NEXT_PAGE_ROWS = 20;

@Component({
  selector: 'app-print-statement',
  imports: [DatePipe, PrintPageFooter],
  templateUrl: './print-statement.html',
  styleUrl: './print-statement.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintStatement {
  readonly statement = input.required<PrintStatementDocument>();

  protected readonly hasAgeing = computed(() => this.statement().ageing.some((bucket) => bucket.amount > 0));
  protected readonly pages = computed<readonly PrintPage<PrintStatementDocument['lines'][number]>[]>(
    () => printPages(this.statement().lines, FIRST_PAGE_ROWS, NEXT_PAGE_ROWS),
  );

  protected money(value: number): string {
    return printMoney(value, this.statement().brand.currencyCode);
  }
}
