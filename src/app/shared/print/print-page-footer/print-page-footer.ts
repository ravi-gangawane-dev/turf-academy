import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { printPageLabel } from '../print-page';

/** Repeated footer that states the sheet number because CSS margin boxes are not rendered. */
@Component({
  selector: 'app-print-page-footer',
  templateUrl: './print-page-footer.html',
  styleUrl: './print-page-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintPageFooter {
  readonly page = input.required<number>();
  readonly total = input.required<number>();
  readonly label = input('');
  readonly note = input('');

  protected pageLabel(): string {
    return printPageLabel(this.page(), this.total());
  }
}
