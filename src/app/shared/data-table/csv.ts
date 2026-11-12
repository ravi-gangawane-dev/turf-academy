export type CsvValue = string | number | boolean | null | undefined;

/** Spreadsheet apps treat these leading characters as formulas. */
const FORMULA_PREFIX = /^[=+\-@]/;

function text(value: CsvValue): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * One quoted CSV cell. Text that could be evaluated as a formula is prefixed
 * with an apostrophe, and embedded quotes are doubled.
 */
export function csvCell(value: CsvValue): string {
  const cell = text(value);
  const guarded = typeof value === 'number' || !FORMULA_PREFIX.test(cell) ? cell : `'${cell}`;
  return `"${guarded.replaceAll('"', '""')}"`;
}

export function createCsv(rows: readonly (readonly CsvValue[])[]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** UTF-8 BOM keeps names in every supported script readable in Excel. */
export function downloadCsv(filename: string, rows: readonly (readonly CsvValue[])[]): void {
  const url = URL.createObjectURL(
    new Blob(['\uFEFF', createCsv(rows)], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  link.download = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
