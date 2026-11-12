/** One explicitly rendered sheet inside a multi-page printable document. */
export interface PrintPage<T> {
  /** 1-based page number. */
  readonly index: number;
  readonly total: number;
  readonly rows: readonly T[];
  /** Zero-based index of the first row on this page, for continuous numbering. */
  readonly offset: number;
  readonly last: boolean;
}

/**
 * Chromium does not render `@page` margin boxes, so a visible "Page X of Y"
 * footer requires splitting the rows into explicit pages ourselves.
 */
export function printPages<T>(
  rows: readonly T[],
  firstPageSize: number,
  nextPageSize = firstPageSize,
): readonly PrintPage<T>[] {
  const pages: PrintPage<T>[] = [];
  let offset = 0;
  for (;;) {
    const size = pages.length === 0 ? firstPageSize : nextPageSize;
    const slice = rows.slice(offset, offset + size);
    pages.push({
      index: pages.length + 1,
      total: 0,
      rows: slice,
      offset,
      last: false,
    });
    offset += slice.length;
    if (offset >= rows.length) break;
  }
  if (!pages.length) pages.push({ index: 1, total: 1, rows: [], offset: 0, last: true });
  const total = pages.length;
  return pages.map((page, index) => ({ ...page, total, last: index === total - 1 }));
}

/** Text exported alongside the document reference in page footers. */
export function printPageLabel(page: number, total: number): string {
  return `Page ${page} of ${total}`;
}
