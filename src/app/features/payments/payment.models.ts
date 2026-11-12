export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'refunded' | 'partially_refunded';

export type PaymentSettlement = 'all' | 'partial' | 'full';

export type PaymentSortKey = 'date' | 'student' | 'amount' | 'status' | 'mode' | 'receipt';

export interface PaymentRow {
  readonly id: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly amountMinor: number;
  readonly mode: string;
  readonly status: PaymentStatus;
  readonly paidAt: string;
  readonly reference: string;
  readonly receiptId: string;
  readonly receiptNumber: string;
  readonly chargeId: string;
}

export interface ChargeOption {
  readonly id: string;
  readonly studentName: string;
  readonly period: string;
  readonly balanceMinor: number;
}

export const PAYMENT_MODES = [
  { label: 'All', value: 'all' },
  { label: 'Partial', value: 'partial' },
  { label: 'Full', value: 'full' },
];

export const SETTLEMENT_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Partial', value: 'partial' },
  { label: 'Full', value: 'full' },
];

export type RecordedPayment = PaymentRow & { readonly receiptNumber: string; readonly receiptId: string };

export function toChargeOption(row: { readonly balance_amount: number; readonly charge_month: string; readonly student?: { readonly full_name: string } | readonly { readonly full_name: string }[] | null }): ChargeOption | null {
  const balance = Math.round(Number(row.balance_amount) * 100);
  if (balance <= 0) return null;
  const student = Array.isArray(row.student) ? row.student[0] : row.student;
  return {
    id: row.charge_month?.slice(0, 7) || '',
    studentName: student?.full_name ?? 'Unknown student',
    period: row.charge_month?.slice(0, 7) || '',
    balanceMinor: balance,
  };
}
