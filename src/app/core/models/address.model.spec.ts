import { FormBuilder } from '@angular/forms';
import { addressFromDatabase, addressLines, createAddressForm, formatAddress } from './address.model';

describe('Address model', () => {
  it('renders serialized and legacy embedded addresses as readable lines', () => {
    const address = { line1: 'KFG', line2: 'Pirangut', city: 'Pune', state: 'Maharashtra', pinCode: '412115' };
    const expected = ['KFG', 'Pirangut', 'Pune, Maharashtra', '412115'];
    expect(addressLines(address)).toEqual(expected);
    expect(addressLines(JSON.stringify(address))).toEqual(expected);
    expect(addressLines({ line1: JSON.stringify(address), city: '', state: '', pinCode: '' })).toEqual(expected);
  });

  it('keeps plain-text addresses and omits missing fields', () => {
    expect(addressLines('12 Academy Road')).toEqual(['12 Academy Road']);
    expect(addressLines({ city: ' Pune ', pin_code: '411001' })).toEqual(['Pune', '411001']);
    expect(addressLines(null)).toEqual([]);
  });
  it('normalizes legacy address keys to the canonical shape', () => {
    expect(addressFromDatabase({
      line1: '',
      formatted: '12 MG Road',
      line2: '',
      address_line2: 'Floor 2',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '',
      postal_code: '411001',
      nationality: 'Indian',
    })).toEqual({
      line1: '12 MG Road',
      line2: 'Floor 2',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411001',
    });
  });

  it('requires all standard address fields except line 2 and validates a six-digit PIN', () => {
    const form = createAddressForm(new FormBuilder().nonNullable);
    expect(form.valid).toBe(false);

    form.patchValue({
      line1: '12 MG Road',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '41100',
    });
    expect(form.valid).toBe(false);

    form.controls.pinCode.setValue('411001');
    expect(form.valid).toBe(true);
  });

  it('formats only the canonical address fields in order', () => {
    expect(formatAddress({
      line1: '12 MG Road',
      line2: 'Floor 2',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411001',
    })).toBe('12 MG Road, Floor 2, Pune, Maharashtra, 411001');
  });
});
