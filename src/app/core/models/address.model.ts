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
  if (typeof value === 'string') {
    value = parseAddressJson(value) ?? { line1: value };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { line1: '', line2: '', city: '', state: '', pinCode: '' };
  }
  let record = value as Record<string, unknown>;
  // Older records may store the entire JSON address inside the first line.
  const firstLine = record['line1'] || record['address'] || record['formatted'];
  const embedded = typeof firstLine === 'string' ? parseAddressJson(firstLine) : null;
  if (embedded) {
    record = {
      ...embedded, ...Object.fromEntries(Object.entries(record)
        .filter(([key, part]) => !['line1', 'address', 'formatted'].includes(key) && part != null && part !== ''))
    };
  }
  return {
    line1: String(record['line1'] || record['address'] || record['formatted'] || ''),
    line2: String(record['line2'] || record['address_line2'] || ''),
    city: String(record['city'] ?? ''),
    state: String(record['state'] ?? ''),
    pinCode: String(record['pinCode'] || record['pin_code'] || record['postal_code'] || ''),
  };
}

function parseAddressJson(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      && ['line1', 'address', 'formatted', 'city', 'state', 'pinCode'].some(key => key in parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch { /* Plain-text addresses remain valid. */ }
  return null;
}

export function addressLines(value: unknown): string[] {
  const address = addressFromDatabase(value);
  const clean = (part?: string) => part?.trim() ?? '';
  return [clean(address.line1), clean(address.line2),
  [clean(address.city), clean(address.state)].filter(Boolean).join(', '),
  clean(address.pinCode)].filter(Boolean);
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
