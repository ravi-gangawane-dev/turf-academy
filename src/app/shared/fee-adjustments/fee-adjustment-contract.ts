export type FeeAdjustmentKind = 'fixed' | 'percentage';
export type FeeAdjustmentStatus = 'active' | 'inactive';

export interface FeeAdjustmentFormValue {
  name: string;
  kind: FeeAdjustmentKind;
  value: number;
  status: FeeAdjustmentStatus;
  validFrom?: string;
  validTill?: string;
  graceDays?: number;
  maximumAmount?: number | null;
}

export interface DiscountRulePayload extends FeeAdjustmentFormValue {
  valid_from: string | null;
  valid_till: string | null;
}

export interface LateFeeRulePayload extends FeeAdjustmentFormValue {
  grace_days: number;
  maximum_amount: number | null;
}

export function isValidFeeAdjustment(value: FeeAdjustmentFormValue, mode: 'discounts' | 'late-fees'): boolean {
  if (!value.name.trim() || !Number.isFinite(value.value) || value.value < 0) return false;
  if (value.kind === 'percentage' && value.value > 100) return false;
  if (mode === 'late-fees' && (!Number.isInteger(value.graceDays) || (value.maximumAmount != null && (!Number.isFinite(value.maximumAmount) || value.maximumAmount < 0)))) return false;
  return !(mode === 'discounts' && value.validFrom && value.validTill && value.validTill < value.validFrom);
}
