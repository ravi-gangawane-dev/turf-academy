import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { AddressFields } from './address-fields';
import { createAddressForm } from '../../core/models/address.model';

describe('AddressFields layout', () => {
  afterEach(() => TestBed.resetTestingModule());

  function render(columns?: 2 | 4) {
    TestBed.configureTestingModule({ imports: [AddressFields] });
    const fixture = TestBed.createComponent(AddressFields);
    fixture.componentRef.setInput('form', createAddressForm(TestBed.inject(FormBuilder).nonNullable));
    if (columns) fixture.componentRef.setInput('columns', columns);
    fixture.detectChanges();
    return fixture;
  }

  it('uses two columns by default', () => {
    const fixture = render();
    expect(fixture.nativeElement.querySelector('.address-fields--four')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.address-field')).toHaveLength(5);
  });

  it('supports four address fields per row', () => {
    const fixture = render(4);
    expect(fixture.nativeElement.querySelector('.address-fields--four')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.address-field')).toHaveLength(5);
  });

  it('renders a formatted single-line address in inline display mode', () => {
    TestBed.configureTestingModule({ imports: [AddressFields] });
    const fixture = TestBed.createComponent(AddressFields);
    fixture.componentRef.setInput('value', {
      line1: '12 Main Road',
      line2: 'Near Ground',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411001',
    });
    fixture.componentRef.setInput('inline', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.address-inline')?.textContent?.trim())
      .toBe('12 Main Road, Near Ground, Pune, Maharashtra, 411001');
    expect(fixture.nativeElement.querySelector('.address-display')).toBeNull();
  });
});
