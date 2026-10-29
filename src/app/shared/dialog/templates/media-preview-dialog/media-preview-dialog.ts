import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DialogConfig } from '../../models/dialog-config.model';

/** Shared image/video preview body. */
@Component({
  selector: 'app-media-preview-dialog',
  templateUrl: './media-preview-dialog.html',
  styleUrl: './media-preview-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaPreviewDialog {
  readonly config = input.required<DialogConfig>();
}
