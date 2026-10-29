import { SupabaseClient } from '@supabase/supabase-js';
import { readAllPages } from './read-all-pages';

export interface PaymentBalance {
  id: string;
  student_id: string;
  paid_at: string;
  payment_mode: string;
  status: string;
  amount: number;
  refunded_amount: number;
  net_amount: number;
  student?: { full_name: string; student_code: string };
  receipt?: { receipt_number: string } | { receipt_number: string }[];
}
export interface PaymentBalanceFilters {
  studentId?: string;
  from?: string;
  to?: string;
  batchId?: string;
}
const settledStatuses = ['successful', 'partially_refunded', 'refunded'];
const minorUnits = (value: number) => Math.round(Number(value) * 100);

export function sumMoney(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + minorUnits(value), 0) / 100;
}

export async function loadPaymentBalances(
  client: SupabaseClient,
  filters: PaymentBalanceFilters,
): Promise<PaymentBalance[]> {
  // Read refunds as top-level paginated rows, so a nested relation cannot truncate them.
  const chargeJoin = filters.batchId
    ? ',charge:monthly_charges!inner(enrollment:enrollments!inner(batch_id))'
    : '';
  const until = filters.to
    ? new Date(Date.parse(`${filters.to}T00:00:00Z`) + 86_400_000).toISOString()
    : undefined;
  const [payments, refunds] = await Promise.all([
    readAllPages('Load payment balances', (offset, limit) => {
      let query = client.from('payments')
        .select(`id,student_id,paid_at,payment_mode,status,amount,student:students(full_name,student_code),receipt:receipts(receipt_number)${chargeJoin}`, { count: 'exact' })
        .in('status', settledStatuses).order('paid_at').order('id')
        .range(offset, offset + limit - 1);
      if (filters.studentId) query = query.eq('student_id', filters.studentId);
      if (filters.from) query = query.gte('paid_at', `${filters.from}T00:00:00Z`);
      if (until) query = query.lt('paid_at', until);
      if (filters.batchId) query = query.eq('charge.enrollment.batch_id', filters.batchId);
      return query;
    }),
    readAllPages('Load payment refunds', (offset, limit) => {
      let query = client.from('payment_refunds')
        .select(`id,payment_id,amount,payment:payments!inner(student_id,paid_at,status${chargeJoin})`, { count: 'exact' })
        .in('payment.status', settledStatuses).order('id')
        .range(offset, offset + limit - 1);
      if (filters.studentId) query = query.eq('payment.student_id', filters.studentId);
      if (filters.from) query = query.gte('payment.paid_at', `${filters.from}T00:00:00Z`);
      if (until) query = query.lt('payment.paid_at', until);
      if (filters.batchId) query = query.eq('payment.charge.enrollment.batch_id', filters.batchId);
      return query;
    }),
  ]);
  const refunded = new Map<string, number>();
  for (const row of refunds as unknown as { payment_id: string; amount: number }[]) {
    refunded.set(row.payment_id, (refunded.get(row.payment_id) ?? 0) + minorUnits(row.amount));
  }
  return (payments as unknown as PaymentBalance[]).map(payment => {
    const refund = refunded.get(payment.id) ?? 0;
    return { ...payment, amount: Number(payment.amount), refunded_amount: refund / 100,
      net_amount: (minorUnits(payment.amount) - refund) / 100 };
  });
}
