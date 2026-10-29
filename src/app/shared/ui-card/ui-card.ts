import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  templateUrl: './ui-card.html',
  styleUrl: './ui-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiCard {
  readonly title = input('');
  readonly subtitle = input('');
  readonly compact = input(false);
}
