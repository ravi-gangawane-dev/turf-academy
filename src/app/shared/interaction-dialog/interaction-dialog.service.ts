import { Injectable, inject } from '@angular/core';
import { DialogService } from '../dialog/dialog.service';
import { DialogType } from '../dialog/models/dialog-config.model';

/**
 * Backwards-compatible facade kept for the feature pages that were migrated
 * earlier. Everything it does is delegated to the centralized DialogService,
 * so all dialogs render through the same host and templates.
 */
@Injectable({ providedIn: 'root' })
export class InteractionDialogService {
  private readonly dialogs = inject(DialogService);

  confirm(
    message: string,
    title = 'Confirm action',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
  ): Promise<boolean> {
    return this.dialogs.confirm({
      message,
      title,
      confirmLabel,
      cancelLabel,
      type: DialogType.CONFIRM,
    });
  }

  prompt(
    message: string,
    value = '',
    title = 'Enter details',
    confirmLabel = 'Continue',
  ): Promise<string | null> {
    return this.dialogs.prompt({ message, title, value, confirmLabel });
  }

  complete(value: boolean | string | null): void {
    if (typeof value === 'string') this.dialogs.close('confirm', value);
    else this.dialogs.close(value === true ? 'confirm' : 'cancel');
  }
}
