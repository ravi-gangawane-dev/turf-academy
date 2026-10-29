import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DialogService } from '../../dialog.service';
import { DialogRequest, DialogType } from '../../models/dialog-config.model';
import { ModalFocus } from '../../../interaction-dialog/modal-focus';
import { ConfirmationDialog } from '../../templates/confirmation-dialog/confirmation-dialog';
import { MessageDialog } from '../../templates/message-dialog/message-dialog';
import { DialogFormState, FormDialog } from '../../templates/form-dialog/form-dialog';
import { MediaPreviewDialog } from '../../templates/media-preview-dialog/media-preview-dialog';

const FORM_TYPES: readonly DialogType[] = [DialogType.FORM, DialogType.PROMPT];
const CONFIRM_TYPES: readonly DialogType[] = [
  DialogType.CONFIRM,
  DialogType.DELETE,
  DialogType.WHATSAPP,
  DialogType.SESSION_EXPIRED,
  DialogType.PERMISSION,
];

/**
 * The single dialog host rendered once by the application shell.
 * It renders whichever DialogService request is active through the shared
 * template components, so features never own dialog markup.
 */
@Component({
  selector: 'app-dialog-host',
  imports: [ModalFocus, ConfirmationDialog, MessageDialog, FormDialog, MediaPreviewDialog],
  templateUrl: './dialog-host.html',
  styleUrl: './dialog-host.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogHost {
  private readonly dialogs = inject(DialogService);

  protected readonly request = this.dialogs.active;
  protected readonly formState = signal<DialogFormState>({ valid: false, value: {} });

  protected readonly isForm = computed(() => this.isFormType(this.request()?.config.type));
  protected readonly primaryLabel = computed(() => {
    const config = this.request()?.config;
    if (!config) return 'OK';
    return config.confirmLabel ?? (this.isFormType(config.type) ? 'Save' : 'OK');
  });
  protected readonly isBusy = computed(
    () => (this.request()?.busy ?? false) || (this.request()?.config.loading ?? false),
  );
  protected readonly primaryDisabled = computed(
    () => this.isBusy() || (this.isForm() && !this.formState().valid),
  );
  protected readonly cancelLabel = computed(() => this.request()?.config.cancelLabel ?? 'Cancel');
  protected readonly sizeClass = computed(() => `size-${this.request()?.config.size ?? 'medium'}`);

  protected isFormType(type: DialogType | undefined): boolean {
    return !!type && FORM_TYPES.includes(type);
  }

  protected isConfirmType(type: DialogType | undefined): boolean {
    return !!type && CONFIRM_TYPES.includes(type);
  }

  protected onFormState(state: DialogFormState): void {
    this.formState.set(state);
  }

  protected cancel(request: DialogRequest): void {
    if (request.config.disableClose || request.busy) return;
    this.dialogs.close('cancel');
  }

  protected onBackdrop(request: DialogRequest, event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) this.cancel(request);
  }

  protected async primary(request: DialogRequest): Promise<void> {
    if (request === null || this.primaryDisabled()) return;
    if (this.isFormType(request.config.type)) {
      const value = this.formState().value;
      await this.dialogs.runAction(request, 'submit', value);
      this.dialogs.close('submit', value);
      return;
    }
    await this.dialogs.runAction(request, 'confirm');
    this.dialogs.close('confirm');
  }
}
