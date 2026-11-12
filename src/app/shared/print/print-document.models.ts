/** Shared shape for every printable document rendered by the print host. */
export interface PrintBrand {
  readonly name: string;
  readonly code: string;
  readonly logoUrl: string;
  readonly address: string;
  readonly phone: string;
  readonly email: string;
  readonly currencyCode: string;
  readonly timezone: string;
}

export interface PrintLineItem {
  readonly description: string;
  readonly reference?: string;
  readonly quantity?: number;
  readonly rate?: number;
  readonly amount: number;
}

export interface PrintTotals {
  readonly subtotal: number;
  readonly discount: number;
  readonly lateFee: number;
  readonly total: number;
  readonly paid: number;
  readonly balance: number;
}

export interface PrintReceiptDocument {
  readonly kind: 'receipt';
  readonly brand: PrintBrand;
  readonly receiptNumber: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly guardianName?: string;
  readonly amount: number;
  readonly paymentMode: string;
  readonly paidAt: string;
  readonly reference?: string;
  readonly status?: string;
  readonly period?: string;
  readonly batchName?: string;
  readonly receivedBy?: string;
}

export interface PrintInvoiceDocument {
  readonly kind: 'invoice';
  readonly brand: PrintBrand;
  readonly invoiceNumber: string;
  readonly issuedAt: string;
  readonly dueDate: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly batchName?: string;
  readonly enrollmentReference?: string;
  readonly period: string;
  readonly status: string;
  readonly items: readonly PrintLineItem[];
  readonly totals: PrintTotals;
  readonly notes?: string;
}

export interface PrintStatementLine {
  readonly date: string;
  readonly type: 'charge' | 'payment' | 'refund';
  readonly description: string;
  readonly reference: string;
  readonly debit: number;
  readonly credit: number;
  readonly balance: number;
}

export interface PrintAgeingBucket {
  readonly label: string;
  readonly amount: number;
}

export interface PrintStatementDocument {
  readonly kind: 'statement';
  readonly brand: PrintBrand;
  readonly statementNumber: string;
  readonly issuedAt: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly batchName?: string;
  readonly openingBalance: number;
  readonly closingBalance: number;
  readonly totalCharges: number;
  readonly totalPayments: number;
  readonly totalRefunds: number;
  readonly lines: readonly PrintStatementLine[];
  readonly ageing: readonly PrintAgeingBucket[];
  readonly notes?: string;
}

export interface PrintRefundReceiptDocument {
  readonly kind: 'refund-receipt';
  readonly brand: PrintBrand;
  readonly refundReceiptNumber: string;
  readonly originalReceiptNumber: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly guardianName?: string;
  readonly refundAmount: number;
  readonly originalAmount: number;
  readonly paymentMode: string;
  readonly refundedAt: string;
  readonly paidAt: string;
  readonly reason: string;
  readonly reference?: string;
  readonly approvedBy?: string;
  readonly batchName?: string;
  readonly period?: string;
}

export interface PrintAttendanceRegisterRow {
  readonly studentCode: string;
  readonly studentName: string;
  readonly status: string;
  readonly checkInAt: string | null;
  readonly checkOutAt: string | null;
  readonly remarks?: string | null;
}

export interface PrintAttendanceRegisterCounts {
  readonly expected: number;
  readonly present: number;
  readonly late: number;
  readonly absent: number;
  readonly checkedOut: number;
  readonly notRecorded: number;
}

export interface PrintAttendanceRegisterDocument {
  readonly kind: 'attendance-register';
  readonly brand: PrintBrand;
  readonly registerNumber: string;
  readonly issuedAt: string;
  readonly date: string;
  readonly batchName: string;
  readonly batchCode: string;
  readonly batchTime?: string;
  readonly coaches: readonly string[];
  readonly rows: readonly PrintAttendanceRegisterRow[];
  readonly counts: PrintAttendanceRegisterCounts;
  readonly showRemarks: boolean;
}

export type PrintAttendanceMatrixCell =
  | 'present'
  | 'late'
  | 'absent'
  | 'checked_out'
  | 'not_recorded'
  | 'off'
  | 'not_enrolled';

export interface PrintAttendanceMatrixDay {
  readonly date: string;
  readonly day: number;
  readonly weekday: string;
  readonly scheduled: boolean;
}

export interface PrintAttendanceMatrixRow {
  readonly studentId: string;
  readonly studentCode: string;
  readonly studentName: string;
  readonly cells: readonly PrintAttendanceMatrixCell[];
  readonly present: number;
  readonly late: number;
  readonly absent: number;
  readonly checkedOut: number;
  readonly recorded: number;
  readonly attended: number;
  readonly percentage: number | null;
}

export interface PrintAttendanceMatrixDocument {
  readonly kind: 'attendance-matrix';
  readonly brand: PrintBrand;
  readonly registerNumber: string;
  readonly issuedAt: string;
  readonly month: string;
  readonly monthLabel: string;
  readonly batchName: string;
  readonly batchCode: string;
  readonly batchTime?: string;
  readonly schedule: string;
  readonly coaches: readonly string[];
  readonly days: readonly PrintAttendanceMatrixDay[];
  readonly rows: readonly PrintAttendanceMatrixRow[];
}

export type PrintIdCardHolder = 'student' | 'coach' | 'parent';

export interface PrintIdCardField {
  readonly label: string;
  readonly value: string;
}

/**
 * CR80 staff/student card. The QR payload and image are derived by the print
 * service from the holder type and id so every card stays scannable.
 */
export interface PrintIdCardDocument {
  readonly kind: 'id-card';
  readonly brand: PrintBrand;
  readonly issuedAt: string;
  readonly cardNumber: string;
  readonly holderType: PrintIdCardHolder;
  readonly holderId: string;
  readonly fullName: string;
  readonly holderCode: string;
  readonly subtitle: string;
  readonly photoUrl: string | null;
  readonly qrPayload: string;
  readonly qrDataUrl: string;
  readonly details: readonly PrintIdCardField[];
  readonly validityNote: string;
}

/** Card data before the service adds branding and the generated QR image. */
export type PrintIdCardInput = Omit<
  PrintIdCardDocument,
  'kind' | 'brand' | 'qrPayload' | 'qrDataUrl'
>;

export type PrintEnrollmentAction =
  | 'created'
  | 'transferred'
  | 'paused'
  | 'reactivated'
  | 'cancelled';

/** One real term/value pair taken from the enrollment, batch, plan or settings. */
export interface PrintEnrollmentTerm {
  readonly label: string;
  readonly value: string;
}

/**
 * Confirmation of an enrollment create, transfer or status change. Every term,
 * guardian and schedule value comes from the live enrollment record; nothing
 * legal is invented by the template.
 */
export interface PrintEnrollmentConfirmationDocument {
  readonly kind: 'enrollment-confirmation';
  readonly brand: PrintBrand;
  readonly confirmationNumber: string;
  readonly issuedAt: string;
  readonly action: PrintEnrollmentAction;
  readonly effectiveOn: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly studentDateOfBirth?: string;
  readonly guardianName?: string;
  readonly guardianPhone?: string;
  readonly guardianRelation?: string;
  readonly batchName: string;
  readonly batchCode: string;
  readonly batchSchedule: string;
  readonly batchTime?: string;
  readonly batchCoaches: readonly string[];
  readonly previousBatchName?: string;
  readonly previousBatchCode?: string;
  readonly planName: string;
  readonly monthlyFee: number;
  readonly registrationFee?: number;
  readonly durationMonths?: number;
  readonly validFrom: string;
  readonly validTill?: string;
  readonly status: string;
  readonly reason?: string;
  readonly notes?: string;
  readonly terms: readonly PrintEnrollmentTerm[];
}

export interface PrintBatchRosterGuardian {
  readonly name: string;
  readonly relation?: string;
  readonly phone: string;
  readonly whatsapp?: string;
  readonly isPrimary: boolean;
  readonly canPickUp: boolean;
}

export interface PrintBatchRosterRow {
  readonly studentId: string;
  readonly studentCode: string;
  readonly studentName: string;
  readonly dateOfBirth?: string;
  readonly status: string;
  readonly guardians: readonly PrintBatchRosterGuardian[];
  /** Only populated when the viewer may read medical records. */
  readonly medical?: string;
}

/** Full batch roster for staff use, including guardian contacts. */
export interface PrintBatchRosterDocument {
  readonly kind: 'batch-roster';
  readonly brand: PrintBrand;
  readonly rosterNumber: string;
  readonly issuedAt: string;
  readonly batchName: string;
  readonly batchCode: string;
  readonly batchStatus: string;
  readonly ageGroup?: string;
  readonly skillLevel?: string;
  readonly schedule: string;
  readonly batchTime?: string;
  readonly batchDates?: string;
  readonly coaches: readonly string[];
  readonly capacity: number;
  readonly enrolled: number;
  readonly includeMedical: boolean;
  readonly rows: readonly PrintBatchRosterRow[];
}

export type PrintTableAlign = 'left' | 'right' | 'center';

export interface PrintTableColumn {
  readonly key: string;
  readonly label: string;
  readonly align?: PrintTableAlign;
}

export type PrintTableCell = string | number | boolean | null | undefined;

/**
 * Any exported directory, report or queue table. The same rows that feed a CSV
 * download can be printed through the shared branded pipeline.
 */
export interface PrintTableDocument {
  readonly kind: 'table';
  readonly brand: PrintBrand;
  readonly title: string;
  readonly subtitle?: string;
  readonly reference: string;
  readonly generatedAt: string;
  readonly columns: readonly PrintTableColumn[];
  readonly rows: readonly Readonly<Record<string, PrintTableCell>>[];
  readonly footer?: string;
}

export type PrintTableInput = Omit<PrintTableDocument, 'kind' | 'brand' | 'generatedAt'>;

export type PrintDocument =
  | PrintReceiptDocument
  | PrintInvoiceDocument
  | PrintStatementDocument
  | PrintRefundReceiptDocument
  | PrintAttendanceRegisterDocument
  | PrintAttendanceMatrixDocument
  | PrintIdCardDocument
  | PrintEnrollmentConfirmationDocument
  | PrintBatchRosterDocument
  | PrintTableDocument;

/**
 * Where a prepared document goes: straight to the browser print dialog, the
 * same dialog with a "Save as PDF" hint, or an on-screen preview that offers
 * both actions.
 */
export type PrintDestination = 'print' | 'pdf' | 'preview';
