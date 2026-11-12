import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * Rendered once in the application shell so every route can raise toasts.
 * The stack sits in the top-right corner and never traps focus or blocks the
 * page: toasts are announced politely and can be dismissed or paused on hover.
 */
@Component({
  selector: 'app-toast-host',
  templateUrl: './toast-host.html',
  styleUrl: './toast-host.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastHost {
  protected readonly toast = inject(ToastService);

  protected handleToastEvent(event: Event, action: 'pause' | 'resume' | 'dismiss'): void {
    // Resolve the currently rendered message, including when the list replaces
    // an earlier toast before its event handler runs.
    const id = (event.currentTarget as HTMLElement).closest<HTMLElement>('[data-toast-id]')?.dataset['toastId'];
    if (id) this.toast[action](id);
  }

  protected icon(kind: string): string {
    switch (kind) {
      case 'success':
        return 'pi-check-circle';
      case 'error':
        return 'pi-exclamation-circle';
      case 'warning':
        return 'pi-exclamation-triangle';
      default:
        return 'pi-info-circle';
    }
  }
}
