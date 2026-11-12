import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ModalFocus } from '../../interaction-dialog/modal-focus';
import { PrintDestination, PrintIdCardInput } from '../print-document.models';

/**
 * Confirms the live card data and sends the chosen destination back to the
 * page, which owns the real academy record and the print service.
 */
@Component({
  selector: 'app-print-id-card-dialog',
  imports: [ModalFocus],
  templateUrl: './print-id-card-dialog.html',
  styleUrl: './print-id-card-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintIdCardDialog {
  readonly open = input(false);
  readonly card = input<PrintIdCardInput | null>(null);
  readonly busy = input(false);
  readonly error = input('');

  readonly prepare = output<PrintDestination>();
  readonly retry = output<void>();
  readonly closed = output<void>();

  protected readonly heading = computed(() => {
    const type = this.card()?.holderType;
    return type === 'coach'
      ? 'Coach ID card'
      : type === 'parent'
        ? 'Guardian ID card'
        : 'Student ID card';
  });

  protected kicker(): string {
    const type = this.card()?.holderType;
    return type === 'coach'
      ? 'Staff identity'
      : type === 'parent'
        ? 'Guardian access'
        : 'Academy identity';
  }

  protected codeLabel(): string {
    const type = this.card()?.holderType;
    return type === 'coach' ? 'Employee code' : type === 'parent' ? 'Parent ID' : 'Student code';
  }

  protected subtitleLabel(): string {
    const type = this.card()?.holderType;
    return type === 'coach' ? 'Specialisations' : type === 'parent' ? 'Relation' : 'Batch';
  }

  protected request(destination: PrintDestination): void {
    if (this.busy() || !this.card()) return;
    this.prepare.emit(destination);
  }

  protected retryPreparation(): void {
    if (this.busy() || !this.card()) return;
    this.retry.emit();
  }

  protected close(): void {
    if (this.busy()) return;
    this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
