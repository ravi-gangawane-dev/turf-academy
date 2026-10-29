import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type SummaryMetricTone = 'green' | 'blue' | 'orange' | 'purple' | 'red' | 'teal' | 'amber' | 'violet';

@Component({
  selector: 'app-summary-metric-card',
  imports: [RouterLink],
  templateUrl: './summary-metric-card.html',
  styleUrl: './summary-metric-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryMetricCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number | null>();
  readonly icon = input.required<string>();
  readonly hint = input('');
  readonly tone = input<SummaryMetricTone>('green');
  readonly route = input('');
}
