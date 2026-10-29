import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-fee-view-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="fee-view-actions" aria-label="Fee views">
      @for (view of views; track view.route) {
        <a [routerLink]="view.route" routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">
          <i [class]="'pi ' + view.icon" aria-hidden="true"></i>
          {{ view.label }}
        </a>
      }
    </nav>
  `,
  styleUrl: './fee-view-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeeViewNavigation {
  protected readonly views = [
    { label: 'Fee Plans', icon: 'pi-list', route: '/fees/plans' },
    { label: 'Monthly Charges', icon: 'pi-wallet', route: '/fees' },
    { label: 'Discounts', icon: 'pi-percentage', route: '/fees/discounts' },
    { label: 'Late Fees', icon: 'pi-clock', route: '/fees/late-fees' },
    { label: 'Pending Fees', icon: 'pi-hourglass', route: '/fees/pending' },
    { label: 'Fee Summary', icon: 'pi-chart-bar', route: '/fees/summary' },
  ];
}
