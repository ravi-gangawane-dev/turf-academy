import { ApplicationRef, inject, Injectable, signal } from '@angular/core';
import { ToastService } from '../toast/toast.service';
import { PrintAuditService } from './print-audit.service';
import { PrintBrandService } from './print-brand.service';
import { PrintPageSetupService } from './print-page-setup.service';
import {
  PrintDestination,
  PrintDocument,
  PrintAttendanceMatrixDocument,
  PrintAttendanceRegisterDocument,
  PrintBatchRosterDocument,
  PrintEnrollmentConfirmationDocument,
  PrintIdCardInput,
  PrintInvoiceDocument,
  PrintProfileSheetInput,
  PrintReceiptDocument,
  PrintRefundReceiptDocument,
  PrintStatementDocument,
  PrintTableInput,
} from './print-document.models';
import { idCardQrDataUrl, idCardQrPayload } from './id-card-qr';

type ReceiptInput = Omit<PrintReceiptDocument, 'kind' | 'brand'>;
type InvoiceInput = Omit<PrintInvoiceDocument, 'kind' | 'brand'>;
type StatementInput = Omit<PrintStatementDocument, 'kind' | 'brand'>;
type RefundReceiptInput = Omit<PrintRefundReceiptDocument, 'kind' | 'brand'>;
type AttendanceRegisterInput = Omit<PrintAttendanceRegisterDocument, 'kind' | 'brand'>;
type AttendanceMatrixInput = Omit<PrintAttendanceMatrixDocument, 'kind' | 'brand'>;
type EnrollmentConfirmationInput = Omit<PrintEnrollmentConfirmationDocument, 'kind' | 'brand'>;
type BatchRosterInput = Omit<PrintBatchRosterDocument, 'kind' | 'brand'>;
type ProfileSheetInput = PrintProfileSheetInput;
type IdCardInput = PrintIdCardInput;

/** Human-readable reference used by the audit trail and print footers. */
function documentReference(document: PrintDocument): string {
  switch (document.kind) {
    case 'receipt':
      return document.receiptNumber;
    case 'invoice':
      return document.invoiceNumber;
    case 'statement':
      return document.statementNumber;
    case 'refund-receipt':
      return document.refundReceiptNumber;
    case 'attendance-register':
    case 'attendance-matrix':
      return document.registerNumber;
    case 'id-card':
      return document.cardNumber;
    case 'enrollment-confirmation':
      return document.confirmationNumber;
    case 'batch-roster':
      return document.rosterNumber;
    case 'profile-sheet':
      return document.reference;
    case 'table':
      return document.reference;
  }
}

const DOCUMENT_LABELS: Record<PrintDocument['kind'], string> = {
  receipt: 'Receipt',
  invoice: 'Invoice',
  statement: 'Statement',
  'refund-receipt': 'Refund-receipt',
  'attendance-register': 'Attendance-register',
  'attendance-matrix': 'Attendance-matrix',
  'id-card': 'ID-card',
  'enrollment-confirmation': 'Enrollment-confirmation',
  'batch-roster': 'Batch-roster',
  'profile-sheet': 'Profile',
  table: 'Report',
};

/**
 * Stable default file name for the browser's Save as PDF dialog. The browser
 * takes document.title as the suggested name, so we set it only while the
 * print dialog is open.
 */
export function printFileName(document: PrintDocument): string {
  const reference = Array.from(documentReference(document))
    .filter((character) => character.charCodeAt(0) > 31)
    .join('')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 120);
  const label = DOCUMENT_LABELS[document.kind];
  return reference ? `${label}-${reference}` : label;
}

/**
 * Prepares a branded document and either prints it through the app-level host
 * or shows it in the on-screen preview. Branding always comes from Academy
 * Settings.
 */
@Injectable({ providedIn: 'root' })
export class PrintDocumentService {
  private readonly appRef = inject(ApplicationRef);
  private readonly brand = inject(PrintBrandService);
  private readonly toast = inject(ToastService);
  private readonly audit = inject(PrintAuditService);
  private readonly pageSetup = inject(PrintPageSetupService);

  readonly document = signal<PrintDocument | null>(null);
  /** Document currently shown in the on-screen preview, if any. */
  readonly preview = signal<PrintDocument | null>(null);
  /** True while branding, QR generation or image loading is still in progress. */
  readonly preparing = signal(false);
  /** Last preparation failure, shown by the preview and print dialogs. */
  readonly error = signal('');
  /** Opens the preview shell before a document exists so loading and errors stay visible. */
  readonly previewOpen = signal(false);
  private retryAction: (() => Promise<void>) | null = null;

  async printReceipt(data: ReceiptInput, destination: PrintDestination = 'print'): Promise<void> {
    await this.run(async () => ({ ...data, kind: 'receipt', brand: await this.brand.load() }), destination);
  }

  async printInvoice(data: InvoiceInput, destination: PrintDestination = 'print'): Promise<void> {
    await this.run(async () => ({ ...data, kind: 'invoice', brand: await this.brand.load() }), destination);
  }

  async printStatement(data: StatementInput, destination: PrintDestination = 'print'): Promise<void> {
    await this.run(async () => ({ ...data, kind: 'statement', brand: await this.brand.load() }), destination);
  }

  async printRefundReceipt(
    data: RefundReceiptInput,
    destination: PrintDestination = 'print',
  ): Promise<void> {
    await this.run(
      async () => ({ ...data, kind: 'refund-receipt', brand: await this.brand.load() }),
      destination,
    );
  }

  async printAttendanceRegister(
    data: AttendanceRegisterInput,
    destination: PrintDestination = 'print',
  ): Promise<void> {
    await this.run(
      async () => ({ ...data, kind: 'attendance-register', brand: await this.brand.load() }),
      destination,
    );
  }

  async printAttendanceMatrix(
    data: AttendanceMatrixInput,
    destination: PrintDestination = 'print',
  ): Promise<void> {
    await this.run(
      async () => ({ ...data, kind: 'attendance-matrix', brand: await this.brand.load() }),
      destination,
    );
  }

  async printIdCard(data: IdCardInput, destination: PrintDestination = 'print'): Promise<void> {
    await this.run(async () => {
      const qrPayload = idCardQrPayload(data.holderType, data.holderId);
      const [brand, qrDataUrl] = await Promise.all([
        this.brand.load(),
        idCardQrDataUrl(qrPayload),
      ]);
      return { ...data, kind: 'id-card', brand, qrPayload, qrDataUrl };
    }, destination);
  }

  async printEnrollmentConfirmation(
    data: EnrollmentConfirmationInput,
    destination: PrintDestination = 'print',
  ): Promise<void> {
    await this.run(
      async () => ({ ...data, kind: 'enrollment-confirmation', brand: await this.brand.load() }),
      destination,
    );
  }

  async printBatchRoster(
    data: BatchRosterInput,
    destination: PrintDestination = 'print',
  ): Promise<void> {
    await this.run(
      async () => ({ ...data, kind: 'batch-roster', brand: await this.brand.load() }),
      destination,
    );
  }

  /** Print a student, parent or coach profile sheet with its record checklist. */
  async printProfileSheet(
    data: ProfileSheetInput,
    destination: PrintDestination = 'print',
  ): Promise<void> {
    await this.run(
      async () => ({ ...data, kind: 'profile-sheet', brand: await this.brand.load() }),
      destination,
    );
  }

  /** Print any exported table (reports, directories, queue) through the same pipeline. */
  async printTable(data: PrintTableInput, destination: PrintDestination = 'print'): Promise<void> {
    await this.run(
      async () => ({
        ...data,
        kind: 'table',
        brand: await this.brand.load(),
        generatedAt: new Date().toISOString(),
      }),
      destination,
    );
  }

  private async run(
    build: () => Promise<PrintDocument>,
    destination: PrintDestination,
  ): Promise<void> {
    this.preparing.set(true);
    this.error.set('');
    if (destination === 'preview') {
      this.previewOpen.set(true);
      this.retryAction = () => this.run(build, destination);
    } else {
      this.retryAction = null;
    }
    try {
      const document = await build();
      await this.show(document, destination);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The document could not be prepared.';
      this.error.set(message);
      this.toast.error(message);
      throw error;
    } finally {
      this.preparing.set(false);
    }
  }

  private async show(document: PrintDocument, destination: PrintDestination): Promise<void> {
    if (destination === 'preview') {
      this.document.set(null);
      this.preview.set(document);
      this.appRef.tick();
      return;
    }
    this.previewOpen.set(false);
    this.preview.set(null);
    this.document.set(document);
    this.appRef.tick();
    await this.waitForImages();
    const body = globalThis.document.body;
    const previousTitle = globalThis.document.title;
    body.classList.add('printing-document');
    this.pageSetup.applyForPrint(document.kind);
    globalThis.document.title = printFileName(document);
    try {
      globalThis.window.print();
    } finally {
      globalThis.document.title = previousTitle;
      body.classList.remove('printing-document');
      this.pageSetup.clearPrintSetup();
      this.document.set(null);
      this.appRef.tick();
    }
    this.audit.recordInBackground({
      action: destination === 'pdf' ? 'download' : 'print',
      documentKind: document.kind,
      reference: documentReference(document),
      format: destination === 'pdf' ? 'pdf' : 'print',
    });
    if (destination === 'pdf') {
      this.toast.info('Choose “Save as PDF” in the browser print dialog to download this document.');
    }
  }

  /** Dismiss the on-screen preview without printing. */
  closePreview(): void {
    if (!this.preview() && !this.previewOpen()) return;
    this.preview.set(null);
    this.previewOpen.set(false);
    this.error.set('');
    this.retryAction = null;
    this.appRef.tick();
  }

  /** Rebuild the preview after a preparation failure. */
  async retryPreview(): Promise<void> {
    const retry = this.retryAction;
    if (!retry || this.preparing()) return;
    await retry();
  }

  /** Print the document that is currently in the preview. */
  async printPreviewed(destination: Exclude<PrintDestination, 'preview'> = 'print'): Promise<void> {
    const document = this.preview();
    if (!document) return;
    this.preview.set(null);
    this.appRef.tick();
    await this.show(document, destination);
  }

  /** Cross-origin logos may still be decoding when the dialog opens. */
  private async waitForImages(): Promise<void> {
    const host = globalThis.document.querySelector('app-print-document-host');
    if (!host) return;
    const images = Array.from(host.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) return resolve();
            const done = () => resolve();
            image.addEventListener('load', done, { once: true });
            image.addEventListener('error', done, { once: true });
            setTimeout(done, 1500);
          }),
      ),
    );
  }
}
