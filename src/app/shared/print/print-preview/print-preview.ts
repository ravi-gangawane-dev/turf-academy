import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ModalFocus } from '../../interaction-dialog/modal-focus';
import { PrintDocumentBody } from '../print-document-body/print-document-body';
import type { PrintOrientation, PrintPageSetup, PrintPaperSize } from '../print-document.models';
import { PrintDocumentService } from '../print-document.service';
import {
  FALLBACK_PAGE_SETUP,
  PRINT_ORIENTATIONS,
  PRINT_PAPER_SIZES,
  pageSetupDimensions,
  pageSetupLabel,
  supportsPageSetup,
} from '../print-page-setup';
import { PrintPageSetupService } from '../print-page-setup.service';

const TITLES: Record<string, string> = {
  invoice: 'Fee invoice',
  receipt: 'Payment receipt',
  statement: 'Fee statement',
  'refund-receipt': 'Refund receipt',
  'attendance-register': 'Daily attendance register',
  'attendance-matrix': 'Monthly attendance matrix',
  'id-card': 'ID card',
  'enrollment-confirmation': 'Enrollment confirmation',
  'batch-roster': 'Batch roster',
  'profile-sheet': 'Profile sheet',
  table: 'Report',
};

/**
 * On-screen preview of a prepared document. Shows the same template that will
 * print, at the paper width, and offers Print and Download PDF without closing
 * the flow the user started.
 */
@Component({
  selector: 'app-print-preview',
  imports: [ModalFocus, PrintDocumentBody],
  templateUrl: './print-preview.html',
  styleUrl: './print-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintPreview {
  private readonly source = inject(PrintDocumentService);
  private readonly pageSetup = inject(PrintPageSetupService);

  protected readonly document = this.source.preview;
  protected readonly open = this.source.previewOpen;
  protected readonly preparing = this.source.preparing;
  protected readonly error = this.source.error;
  protected readonly busy = signal(false);
  protected readonly actionsDisabled = computed(
    () => this.busy() || this.preparing() || !this.document(),
  );

  protected readonly sizes = PRINT_PAPER_SIZES;
  protected readonly orientations = PRINT_ORIENTATIONS;

  protected readonly title = computed(() => {
    const document = this.document();
    if (document?.kind === 'id-card') {
      return document.holderType === 'coach' ? 'Coach ID card' : 'Student ID card';
    }
    return TITLES[document?.kind ?? ''] ?? 'Document';
  });
  protected readonly setup = computed<PrintPageSetup>(() => {
    const document = this.document();
    return document ? this.pageSetup.setupFor(document.kind) : FALLBACK_PAGE_SETUP;
  });
  protected readonly paperLabel = computed(() => pageSetupLabel(this.setup()));
  protected readonly paperWidth = computed(() =>
    pageSetupDimensions(this.document()?.kind ?? 'table', this.setup()).widthMm,
  );
  protected readonly paperMargin = computed(() =>
    pageSetupDimensions(this.document()?.kind ?? 'table', this.setup()).marginMm,
  );
  protected readonly canChangePaper = computed(() => {
    const document = this.document();
    return Boolean(document && supportsPageSetup(document.kind));
  });
  protected readonly overridden = computed(() => {
    const document = this.document();
    return Boolean(document && this.pageSetup.hasOverride(document.kind));
  });

  protected close(): void {
    if (this.busy()) return;
    this.source.closePreview();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected async retry(): Promise<void> {
    await this.source.retryPreview();
  }

  protected changeSize(event: Event): void {
    const document = this.document();
    if (!document) return;
    const size = (event.target as HTMLSelectElement).value as PrintPaperSize;
    this.pageSetup.save(document.kind, { ...this.setup(), size });
  }

  protected changeOrientation(event: Event): void {
    const document = this.document();
    if (!document) return;
    const orientation = (event.target as HTMLSelectElement).value as PrintOrientation;
    this.pageSetup.save(document.kind, { ...this.setup(), orientation });
  }

  protected useDefault(): void {
    const document = this.document();
    if (!document) return;
    this.pageSetup.reset(document.kind);
  }

  protected print(): Promise<void> {
    return this.send('print');
  }

  protected download(): Promise<void> {
    return this.send('pdf');
  }

  private async send(destination: 'print' | 'pdf'): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.source.printPreviewed(destination);
    } finally {
      this.busy.set(false);
    }
  }
}
