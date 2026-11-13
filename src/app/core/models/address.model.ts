import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';

export interface Address {
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly state: string;
  readonly pinCode: string;
}

export type AddressFormGroup = FormGroup<{
  line1: FormControl<string>;
  line2: FormControl<string>;
  city: FormControl<string>;
  state: FormControl<string>;
  pinCode: FormControl<string>;
}>;

export function addressFromDatabase(value: unknown): Address {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { line1: '', line2: '', city: '', state: '', pinCode: '' };
  }
  const record = value as Record<string, unknown>;
  return {
    line1: String(record['line1'] || record['address'] || record['formatted'] || ''),
    line2: String(record['line2'] || record['address_line2'] || ''),
    city: String(record['city'] ?? ''),
    state: String(record['state'] ?? ''),
    pinCode: String(record['pinCode'] || record['pin_code'] || record['postal_code'] || ''),
  };
}

export function createAddressForm(fb: NonNullableFormBuilder): AddressFormGroup {
  return fb.group({
    line1: fb.control('', Validators.required),
    line2: fb.control(''),
    city: fb.control('', Validators.required),
    state: fb.control('', Validators.required),
    pinCode: fb.control('', [Validators.required, Validators.pattern(/^\d{6}$/)]),
  });
}

export function addressValue(value: Address): Address {
  return {
    line1: value.line1.trim(),
    line2: value.line2?.trim() || '',
    city: value.city.trim(),
    state: value.state.trim(),
    pinCode: value.pinCode.trim(),
  };
}

export function formatAddress(value: Address | null | undefined): string {
  if (!value) return '';
  return [value.line1, value.line2, value.city, value.state, value.pinCode]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(', ');
}
