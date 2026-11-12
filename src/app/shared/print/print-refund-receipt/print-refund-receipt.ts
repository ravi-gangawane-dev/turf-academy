import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrintRefundReceiptDocument } from '../print-document.models';
import { amountInWords, printMoney } from '../print-format';

@Component({
  selector: 'app-print-refund-receipt',
  imports: [DatePipe],
  templateUrl: './print-refund-receipt.html',
  styleUrl: './print-refund-receipt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintRefundReceipt {
  readonly refund = input.required<PrintRefundReceiptDocument>();

  protected readonly payerName = computed(
    () => this.refund().guardianName?.trim() || this.refund().studentName,
  );
  protected readonly words = computed(() =>
    amountInWords(this.refund().refundAmount, this.refund().brand.currencyCode),
  );

  protected money(value: number): string {
    return printMoney(value, this.refund().brand.currencyCode);
  }
}
