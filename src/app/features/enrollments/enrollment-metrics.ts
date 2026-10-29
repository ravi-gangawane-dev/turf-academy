import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';

export interface EnrollmentMetricsModel {
  readonly total: number;
  readonly active: number;
  readonly paused: number;
  readonly cancelled: number;
  readonly expiring: number;
}

@Component({
  selector: 'app-enrollment-metrics',
  imports: [SummaryMetricCard],
  template: `
    <section class="metrics" aria-label="Enrollment summary">
      @for (item of cards(); track item.label) {
        <app-summary-metric-card [label]="item.label" [value]="item.value" [icon]="item.icon" [hint]="item.detail" [tone]="item.tone" />
      }
    </section>
  `,
  styles: [`
    .metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;}
    @media(max-width:1100px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:620px){.metrics{grid-template-columns:1fr}}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentMetrics {
  readonly metrics = input.required<EnrollmentMetricsModel>();
  protected cards() {
    const value = this.metrics();
    const percent = (count: number) => `${value.total ? ((count / value.total) * 100).toFixed(1) : 0}% of total`;
    return [
      { label: 'Total Enrollments', value: value.total, detail: 'All time', icon: 'pi-users', tone: 'green' },
      { label: 'Active Enrollments', value: value.active, detail: percent(value.active), icon: 'pi-user-plus', tone: 'green' },
      { label: 'Paused Enrollments', value: value.paused, detail: percent(value.paused), icon: 'pi-pause-circle', tone: 'orange' },
      { label: 'Cancelled Enrollments', value: value.cancelled, detail: percent(value.cancelled), icon: 'pi-times-circle', tone: 'red' },
      { label: 'Expiring Soon', value: value.expiring, detail: 'Next 30 days', icon: 'pi-calendar', tone: 'purple' },
    ] as const;
  }
}
