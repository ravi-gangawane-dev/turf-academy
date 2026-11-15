import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PrintDocumentBody } from '../print-document-body/print-document-body';
import { PrintDocumentService } from '../print-document.service';

/** Hidden until the print dialog opens; renders every document in the print job. */
@Component({
  selector: 'app-print-document-host',
  imports: [PrintDocumentBody],
  templateUrl: './print-document-host.html',
  styleUrl: './print-document-host.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintDocumentHost {
  private readonly source = inject(PrintDocumentService);

  protected readonly documents = this.source.documents;
}
