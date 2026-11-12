import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrintDocument } from '../print-document.models';
import { PrintAttendanceMatrix } from '../print-attendance-matrix/print-attendance-matrix';
import { PrintAttendanceRegister } from '../print-attendance-register/print-attendance-register';
import { PrintBatchRoster } from '../print-batch-roster/print-batch-roster';
import { PrintEnrollmentConfirmation } from '../print-enrollment-confirmation/print-enrollment-confirmation';
import { PrintIdCard } from '../print-id-card/print-id-card';
import { PrintInvoice } from '../print-invoice/print-invoice';
import { PrintProfileSheet } from '../print-profile-sheet/print-profile-sheet';
import { PrintReceipt } from '../print-receipt/print-receipt';
import { PrintRefundReceipt } from '../print-refund-receipt/print-refund-receipt';
import { PrintStatement } from '../print-statement/print-statement';
import { PrintTable } from '../print-table/print-table';

/**
 * Renders exactly one document template for a prepared print document. Shared
 * by the hidden print host and the on-screen preview so both always agree.
 */
@Component({
  selector: 'app-print-document-body',
  imports: [
    PrintAttendanceMatrix,
    PrintAttendanceRegister,
    PrintBatchRoster,
    PrintEnrollmentConfirmation,
    PrintIdCard,
    PrintInvoice,
    PrintProfileSheet,
    PrintReceipt,
    PrintRefundReceipt,
    PrintStatement,
    PrintTable,
  ],
  templateUrl: './print-document-body.html',
  styleUrl: './print-document-body.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintDocumentBody {
  readonly document = input.required<PrintDocument>();

  protected readonly invoice = computed(() => {
    const document = this.document();
    return document.kind === 'invoice' ? document : null;
  });
  protected readonly receipt = computed(() => {
    const document = this.document();
    return document.kind === 'receipt' ? document : null;
  });
  protected readonly statement = computed(() => {
    const document = this.document();
    return document.kind === 'statement' ? document : null;
  });
  protected readonly refundReceipt = computed(() => {
    const document = this.document();
    return document.kind === 'refund-receipt' ? document : null;
  });
  protected readonly attendanceRegister = computed(() => {
    const document = this.document();
    return document.kind === 'attendance-register' ? document : null;
  });
  protected readonly attendanceMatrix = computed(() => {
    const document = this.document();
    return document.kind === 'attendance-matrix' ? document : null;
  });
  protected readonly idCard = computed(() => {
    const document = this.document();
    return document.kind === 'id-card' ? document : null;
  });
  protected readonly enrollmentConfirmation = computed(() => {
    const document = this.document();
    return document.kind === 'enrollment-confirmation' ? document : null;
  });
  protected readonly batchRoster = computed(() => {
    const document = this.document();
    return document.kind === 'batch-roster' ? document : null;
  });
  protected readonly profileSheet = computed(() => {
    const document = this.document();
    return document.kind === 'profile-sheet' ? document : null;
  });
  protected readonly table = computed(() => {
    const document = this.document();
    return document.kind === 'table' ? document : null;
  });
}
