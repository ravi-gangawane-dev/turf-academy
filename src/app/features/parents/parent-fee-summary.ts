export interface ChargeBalanceSummary {
  readonly total: number;
  readonly paid: number;
  readonly pending: number;
}

export function summarizeChargeBalances(rows: readonly ParentPortalRecord[]): ChargeBalanceSummary {
  return rows.reduce<ChargeBalanceSummary>(
    (summary, row) => ({
      total: summary.total + amount(row['final_amount']),
      paid: summary.paid + amount(row['paid_amount']),
      pending: summary.pending + amount(row['balance_amount']),
    }),
    { total: 0, paid: 0, pending: 0 },
  );
}

export function latestChargeBalance(rows: readonly ParentPortalRecord[]): ChargeBalanceSummary {
  const latest = rows[0];
  return latest
    ? {
        total: amount(latest['final_amount']),
        paid: amount(latest['paid_amount']),
        pending: amount(latest['balance_amount']),
      }
    : { total: 0, paid: 0, pending: 0 };
}

function amount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
import { ParentPortalRecord } from './parent-portal.models';
