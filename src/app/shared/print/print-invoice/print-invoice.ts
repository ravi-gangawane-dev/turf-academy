import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrintInvoiceDocument } from '../print-document.models';
import { printMoney, printStatusLabel, printStatusTone } from '../print-format';

@Component({
  selector: 'app-print-invoice',
  imports: [DatePipe],
  templateUrl: './print-invoice.html',
  styleUrl: './print-invoice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintInvoice {
  readonly invoice = input.required<PrintInvoiceDocument>();

  protected readonly statusLabel = computed(() => printStatusLabel(this.invoice().status));
  protected readonly statusTone = computed(() => printStatusTone(this.invoice().status));
  protected readonly hasDiscount = computed(() => Number(this.invoice().totals.discount) > 0);
  protected readonly hasLateFee = computed(() => Number(this.invoice().totals.lateFee) > 0);
  protected readonly hasPaid = computed(() => Number(this.invoice().totals.paid) > 0);
  protected readonly hasContact = computed(() => {
    const brand = this.invoice().brand;
    return Boolean(brand.address || brand.phone || brand.email || brand.registrationNumber);
  });

  protected money(value: number): string {
    return printMoney(value, this.invoice().brand.currencyCode);
  }
}
