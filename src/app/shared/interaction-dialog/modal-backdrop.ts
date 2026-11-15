import { Directive, output } from '@angular/core';

/**
 * Standard dialog backdrop: marks the element presentational and dismisses the
 * dialog when the backdrop itself (not the panel inside it) is clicked.
 */
@Directive({
  selector: '[appModalBackdrop]',
  host: { role: 'presentation', '(click)': 'clicked($event)' },
})
export class ModalBackdrop {
  readonly dismiss = output<void>();

  protected clicked(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.dismiss.emit();
  }
}
