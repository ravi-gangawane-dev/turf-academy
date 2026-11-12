import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ModalFocus } from '../../interaction-dialog/modal-focus';
import { PrintDocumentBody } from '../print-document-body/print-document-body';
import { PrintDocumentService } from '../print-document.service';

const TITLES: Record<string, string> = {
  invoice: 'Fee invoice',
  receipt: 'Payment receipt',
  statement: 'Fee statement',
  'refund-receipt': 'Refund receipt',
  'attendance-register': 'Daily attendance register',
  'attendance-matrix': 'Monthly attendance matrix',
  'id-card': 'ID card',
};

const PAPER_LABELS: Record<string, string> = {
  a4: 'A4',
  'a4-landscape': 'A4 landscape',
  a5: 'A5',
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

  protected readonly document = this.source.preview;
  protected readonly open = this.source.previewOpen;
  protected readonly preparing = this.source.preparing;
  protected readonly error = this.source.error;
  protected readonly busy = signal(false);
  protected readonly actionsDisabled = computed(
    () => this.busy() || this.preparing() || !this.document(),
  );

  protected readonly title = computed(() => {
    const document = this.document();
    if (document?.kind === 'id-card') {
      return document.holderType === 'coach' ? 'Coach ID card' : 'Student ID card';
    }
    return TITLES[document?.kind ?? ''] ?? 'Document';
  });
  protected readonly paper = computed(() => {
    const kind = this.document()?.kind;
    if (kind === 'receipt' || kind === 'refund-receipt') return 'a5';
    if (kind === 'attendance-matrix') return 'a4-landscape';
    return 'a4';
  });
  protected readonly paperLabel = computed(() => PAPER_LABELS[this.paper()] ?? 'A4');

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
