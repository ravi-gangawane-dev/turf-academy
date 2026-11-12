/** What produced an audited document. */
export type PrintAuditAction = 'print' | 'download' | 'preview';

/** File or paper output the user generated. */
export type PrintAuditFormat = 'print' | 'pdf' | 'csv' | 'json';

export interface PrintAuditEvent {
  readonly action: PrintAuditAction;
  readonly documentKind: string;
  readonly reference: string;
  readonly format: PrintAuditFormat;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
