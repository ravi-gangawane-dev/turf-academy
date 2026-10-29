import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogConfig, DialogFormControl } from '../../models/dialog-config.model';

export interface DialogFormState {
  valid: boolean;
  value: Record<string, unknown>;
}

/** Shared reactive-form dialog body. Validation lives here; saving lives in the feature service. */
@Component({
  selector: 'app-form-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './form-dialog.html',
  styleUrl: './form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormDialog {
  readonly config = input.required<DialogConfig>();
  readonly stateChange = output<DialogFormState>();

  private readonly destroyRef = inject(DestroyRef);
  protected readonly form = signal<FormGroup | null>(null);
  private built = false;

  constructor() {
    effect(() => {
      const config = this.config();
      if (this.built) return;
      this.built = true;
      const group = new FormGroup<Record<string, FormControl>>({});
      for (const field of config.fields ?? []) {
        group.addControl(field.id, this.toControl(field, config.data));
      }
      this.form.set(group);
      group.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.emitState());
      this.emitState();
    });
  }

  protected controlOf(id: string): FormControl {
    return this.form()!.get(id) as FormControl;
  }

  private toControl(field: DialogFormControl, data: unknown): FormControl {
    const dataRecord = (data ?? {}) as Record<string, unknown>;
    const initial =
      dataRecord[field.id] ??
      field.defaultValue ??
      (field.type === 'select' ? field.options?.[0]?.value ?? '' : this.emptyValue(field));
    const validators = [
      ...(field.required ? [Validators.required] : []),
      ...(field.minLength ? [Validators.minLength(field.minLength)] : []),
    ];
    return new FormControl(initial, { validators, nonNullable: true });
  }

  private emptyValue(field: DialogFormControl): string | number | boolean {
    return field.type === 'checkbox' ? false : '';
  }

  private emitState(): void {
    const group = this.form();
    if (!group) return;
    this.stateChange.emit({ valid: group.valid, value: group.getRawValue() });
  }
}
