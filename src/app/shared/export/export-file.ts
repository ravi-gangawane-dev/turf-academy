import { createCsv, downloadCsv } from '../data-table/csv';
import { ExportColumn, ExportFormat, ExportRow } from './export.models';

/** Save an in-browser blob (JSON backup, exported file) under a user-facing name. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(filename: string, value: unknown): void {
  downloadBlob(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`,
  );
}

/** Same values, same escaping, whether a table is exported as CSV or JSON. */
export function exportTableAs(format: Exclude<ExportFormat, 'pdf'>, filename: string, columns: readonly ExportColumn[], rows: readonly ExportRow[]): void {
  if (format === 'csv') {
    downloadCsv(filename, [
      columns.map((column) => column.label),
      ...rows.map((row) => columns.map((column) => row[column.key] ?? '')),
    ]);
    return;
  }
  downloadJson(filename, {
    format: 'turf-academy-table-v1',
    exportedAt: new Date().toISOString(),
    columns: columns.map(({ key, label }) => ({ key, label })),
    rows,
  });
}

/** Exposed for tests and callers that need the CSV text without a download. */
export function tableCsv(columns: readonly ExportColumn[], rows: readonly ExportRow[]): string {
  return createCsv([
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => row[column.key] ?? '')),
  ]);
}
