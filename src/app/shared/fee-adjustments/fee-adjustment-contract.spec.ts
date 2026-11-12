import { isValidFeeAdjustment } from './fee-adjustment-contract';

describe('Fee adjustment rules', () => {
  const base = { name: 'Standard', kind: 'fixed' as const, value: 100, status: 'active' as const };

  it('accepts a valid discount', () => {
    expect(isValidFeeAdjustment({ ...base, validFrom: '2026-01-01', validTill: '2026-12-31' }, 'discounts')).toBeTruthy();
  });

  it('rejects a discount whose end date precedes its start date', () => {
    expect(isValidFeeAdjustment({ ...base, validFrom: '2026-12-31', validTill: '2026-01-01' }, 'discounts')).toBeFalsy();
  });

  it('rejects percentages above one hundred', () => {
    expect(isValidFeeAdjustment({ ...base, kind: 'percentage', value: 101 }, 'discounts')).toBeFalsy();
  });

  it('requires whole non-negative grace days for late fees', () => {
    expect(isValidFeeAdjustment({ ...base, graceDays: 2 }, 'late-fees')).toBeTruthy();
    expect(isValidFeeAdjustment({ ...base, graceDays: 1.5 }, 'late-fees')).toBeFalsy();
  });

  it('rejects negative late-fee caps', () => {
    expect(isValidFeeAdjustment({ ...base, graceDays: 2, maximumAmount: -1 }, 'late-fees')).toBeFalsy();
  });
});
