import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrintReceiptDocument } from '../print-document.models';
import { amountInWords, printMoney, printStatusLabel, printStatusTone } from '../print-format';

@Component({
  selector: 'app-print-receipt',
  imports: [DatePipe],
  templateUrl: './print-receipt.html',
  styleUrl: './print-receipt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintReceipt {
  readonly receipt = input.required<PrintReceiptDocument>();

  protected readonly statusLabel = computed(() => printStatusLabel(this.receipt().status));
  protected readonly statusTone = computed(() => printStatusTone(this.receipt().status));
  protected readonly payerName = computed(
    () => this.receipt().guardianName?.trim() || this.receipt().studentName,
  );
  protected readonly words = computed(() =>
    amountInWords(this.receipt().amount, this.receipt().brand.currencyCode),
  );

  protected money(value: number): string {
    return printMoney(value, this.receipt().brand.currencyCode);
  }
}
