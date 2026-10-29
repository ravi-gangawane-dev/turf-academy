import { describe, expect, it } from 'vitest';
import { latestChargeBalance, summarizeChargeBalances } from './parent-fee-summary';

describe('parent fee summaries', () => {
  it('uses the paid and balance amounts assigned to each charge', () => {
    expect(
      summarizeChargeBalances([
        { final_amount: 3500, paid_amount: 1000, balance_amount: 2500 },
        { final_amount: 3500, paid_amount: 3500, balance_amount: 0 },
      ]),
    ).toEqual({ total: 7000, paid: 4500, pending: 2500 });
  });

  it('uses only the latest charge on the dashboard', () => {
    expect(
      latestChargeBalance([
        { final_amount: 4000, paid_amount: 1500, balance_amount: 2500 },
        { final_amount: 4000, paid_amount: 4000, balance_amount: 0 },
      ]),
    ).toEqual({ total: 4000, paid: 1500, pending: 2500 });
  });

  it('returns zero values when no charge exists', () => {
    expect(latestChargeBalance([])).toEqual({ total: 0, paid: 0, pending: 0 });
  });
});
