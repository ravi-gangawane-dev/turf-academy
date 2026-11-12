/** How much of the filtered dataset a download contains. */
export type ExportScope = 'filtered' | 'page' | 'selected';

/** File or paper output offered by the shared export dialog. */
export type ExportFormat = 'csv' | 'json' | 'pdf';

export type ExportAlign = 'left' | 'right' | 'center';

export type ExportCell = string | number | boolean | null | undefined;

export type ExportRow = Readonly<Record<string, ExportCell>>;

export interface ExportColumn {
  readonly key: string;
  readonly label: string;
  readonly align?: ExportAlign;
}

export interface ExportRequest {
  readonly title: string;
  readonly filename: string;
  readonly reference: string;
  readonly subtitle?: string;
  readonly columns: readonly ExportColumn[];
  readonly rows: readonly ExportRow[];
}

/** The user's choices from the shared export dialog. */
export interface ExportChoice {
  readonly scope: ExportScope;
  readonly format: ExportFormat;
}
