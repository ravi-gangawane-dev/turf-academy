import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DialogConfig, DialogType } from '../../models/dialog-config.model';

/** Body of information, success, warning, error and loading dialogs. */
@Component({
  selector: 'app-message-dialog',
  templateUrl: './message-dialog.html',
  styleUrl: './message-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageDialog {
  readonly config = input.required<DialogConfig>();

  protected readonly tone = computed(() => {
    switch (this.config().type) {
      case DialogType.SUCCESS:
        return 'success';
      case DialogType.WARNING:
        return 'warning';
      case DialogType.ERROR:
        return 'error';
      case DialogType.LOADING:
        return 'loading';
      default:
        return 'info';
    }
  });

  protected readonly icon = computed(() => {
    if (this.config().icon) return this.config().icon as string;
    switch (this.tone()) {
      case 'success':
        return 'pi pi-check-circle';
      case 'warning':
        return 'pi pi-exclamation-triangle';
      case 'error':
        return 'pi pi-times-circle';
      default:
        return 'pi pi-info-circle';
    }
  });
}
