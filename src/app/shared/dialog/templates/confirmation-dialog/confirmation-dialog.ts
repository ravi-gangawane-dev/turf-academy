import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DialogConfig } from '../../models/dialog-config.model';

/** Body of a confirmation/delete/whatsapp dialog. Rendering only — no business logic. */
@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialog {
  readonly config = input.required<DialogConfig>();
}
