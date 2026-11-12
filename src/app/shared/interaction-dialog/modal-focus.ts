import { AfterViewInit, Directive, ElementRef, inject, input, OnDestroy, output } from '@angular/core';

/** Shared keyboard behavior for form, refund and confirmation dialogs. */
@Directive({
  selector: '[appModalFocus]',
  host: { role: 'dialog', 'aria-modal': 'true', tabindex: '-1', '(keydown)': 'keydown($event)' },
})
export class ModalFocus implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly previousFocus = document.activeElement as HTMLElement | null;
  private static openCount = 0;
  private static previousOverflow = '';
  private acquiredScrollLock = false;
  readonly modalBusy = input(false);
  readonly modalDismiss = output<void>();

  ngAfterViewInit(): void {
    this.acquiredScrollLock = true;
    if (ModalFocus.openCount++ === 0) {
      ModalFocus.previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    queueMicrotask(() => {
      if (!this.element.isConnected) return;
      const field = this.focusable().find(node => node.matches('input, textarea, select'));
      (field ?? this.focusable()[0] ?? this.element).focus();
    });
  }

  protected keydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!this.modalBusy()) this.modalDismiss.emit();
    } else if (event.key === 'Tab') {
      const items = this.focusable();
      const first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); this.element.focus(); return; }
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === this.element)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (active === last || active === this.element)) {
        event.preventDefault(); first.focus();
      }
    }
  }

  private focusable(): HTMLElement[] {
    return [...this.element.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]')]
      .filter((node) => !node.matches(':disabled, [tabindex="-1"], [type="hidden"]') && node.getClientRects().length > 0);
  }

  ngOnDestroy(): void {
    if (this.acquiredScrollLock && --ModalFocus.openCount === 0) document.body.style.overflow = ModalFocus.previousOverflow;
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
  }
}
