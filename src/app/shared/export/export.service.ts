import { inject, Injector, Injectable } from '@angular/core';
import { PrintAuditService } from '../print/print-audit.service';
import { PrintDocumentService } from '../print/print-document.service';
import { exportTableAs } from './export-file';
import { ExportChoice, ExportRequest } from './export.models';

/**
 * One export path for every directory, report and queue table.
 *
 * CSV and JSON are generated from the exact rows the caller selected; PDF goes
 * through the same branded print pipeline as invoices and statements.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly injector = inject(Injector);

  async export(request: ExportRequest, choice: ExportChoice): Promise<void> {
    if (!request.rows.length) {
      throw new Error('There are no rows to export.');
    }
    if (choice.format === 'pdf') {
      await this.injector.get(PrintDocumentService).printTable(
        {
          title: request.title,
          subtitle: request.subtitle,
          reference: request.reference,
          columns: request.columns,
          rows: request.rows,
          footer: `Exported ${request.rows.length} row${request.rows.length === 1 ? '' : 's'} from live academy records`,
        },
        'pdf',
      );
      return;
    }
    exportTableAs(choice.format, request.filename, request.columns, request.rows);
    try {
      this.injector.get(PrintAuditService).recordInBackground({
        action: 'download',
        documentKind: 'table',
        reference: request.reference,
        format: choice.format,
        metadata: { rows: request.rows.length, scope: choice.scope },
      });
    } catch {
      // Auditing is best-effort and must never fail a completed download.
    }
  }
}
