import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

export interface PaymentRecordDialogCharge {
  readonly id: string;
  readonly studentName: string;
  readonly period: string;
  readonly balanceMinor: number;
}

export interface PaymentRecordDialogValue {
  readonly chargeId: string;
  readonly amount: number;
  readonly mode: string;
  readonly providerReference: string;
}

@Component({
  selector: 'app-payment-record-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  template: `
    <section class="payment-record-dialog" role="dialog" aria-labelledby="payment-record-title">
      <h2 id="payment-record-title">{{ title }}</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Outstanding charge
          <select formControlName="chargeId" (change)="chargeChanged()">
            <option value="">Select student and period</option>
            @for (charge of charges; track charge.id) {
              <option [value]="charge.id">{{ charge.studentName }} · {{ charge.period }} · {{ charge.balanceMinor / 100 | number:'1.2-2' }}</option>
            }
          </select>
        </label>
        <label>Amount<input type="number" min="0.01" step="0.01" formControlName="amount" /></label>
        <label>Payment mode
          <select formControlName="mode">
            <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option><option value="online">Online</option>
          </select>
        </label>
        <label>Provider reference<input formControlName="providerReference" autocomplete="off" /></label>
        @if (form.touched && form.invalid) { <p class="error" role="alert">Select a charge and enter a valid amount within the outstanding balance.</p> }
        <button class="primary" [disabled]="saving">{{ saving ? 'Recording…' : 'Record payment' }}</button>
      </form>
    </section>
  `,
  styles: [`
    :host { display:block; }
    .payment-record-dialog { padding:1.25rem; }
    form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
    label { display:grid; gap:.4rem; }
    input, select { min-height:42px; border:1px solid #ccd7d1; border-radius:8px; padding:.6rem; }
    .primary { grid-column:1/-1; justify-self:start; border:0; border-radius:9px; background:#267d46; color:#fff; padding:.75rem 1rem; }
    .error { grid-column:1/-1; color:#a52b2b; }
    @media (max-width:800px) { form { grid-template-columns:1fr; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentRecordDialog {
  @Input() title = 'Payment details';
  @Input() charges: readonly PaymentRecordDialogCharge[] = [];
  @Input() saving = false;
  @Output() submitted = new EventEmitter<PaymentRecordDialogValue>();
  private readonly fb = new FormBuilder();
  readonly form = this.fb.nonNullable.group({
    chargeId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    mode: ['upi', Validators.required],
    providerReference: ['', Validators.maxLength(100)],
  });
  chargeChanged(): void {
    const charge = this.charges.find((item) => item.id === this.form.controls.chargeId.value);
    if (charge) {
      this.form.controls.amount.setValidators([Validators.required, Validators.min(0.01), Validators.max(charge.balanceMinor / 100)]);
      this.form.controls.amount.setValue(charge.balanceMinor / 100);
      this.form.controls.amount.updateValueAndValidity();
    }
  }
  submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    this.submitted.emit({ chargeId: value.chargeId, amount: Math.round(value.amount * 100) / 100, mode: value.mode, providerReference: value.providerReference.trim() });
  }
}
