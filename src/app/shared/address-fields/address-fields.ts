import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Address, AddressFormGroup, formatAddress } from '../../core/models/address.model';

@Component({
  selector: 'app-address-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './address-fields.html',
  styleUrl: './address-fields.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressFields {
  readonly form = input<AddressFormGroup | null>(null);
  readonly value = input<Address | null>(null);
  readonly readOnly = input(false);
  readonly columns = input<2 | 4>(2);
  readonly inline = input(false);
  protected readonly formattedAddress = computed(() => formatAddress(this.value()) || '—');
  protected readonly fields = computed(() => {
    const address = this.value();
    return [
      { label: 'Address Line 1', value: address?.line1 || '—' },
      { label: 'Address Line 2', value: address?.line2 || '—' },
      { label: 'City', value: address?.city || '—' },
      { label: 'State', value: address?.state || '—' },
      { label: 'PIN Code', value: address?.pinCode || '—' },
    ];
  });
}
