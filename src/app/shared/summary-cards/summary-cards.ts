import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SummaryMetricCard, SummaryMetricTone } from '../summary-metric-card/summary-metric-card';

export interface SummaryCard {
  readonly label: string;
  readonly value: string | number;
  readonly hint?: string;
  readonly icon: string;
  readonly route?: string;
  readonly tone?: SummaryMetricTone;
}

@Component({
  selector: 'app-summary-cards',
  imports: [SummaryMetricCard],
  templateUrl: './summary-cards.html',
  styleUrl: './summary-cards.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryCards {
  readonly cards = input.required<readonly SummaryCard[]>();
  readonly ariaLabel = input('Summary');
}
