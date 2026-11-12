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
    { label: 'Fees', icon: 'pi-wallet', route: '/fees' },
    { label: 'Fee Plans', icon: 'pi-list', route: '/fees/plans' },
    { label: 'Fee Adjustments', icon: 'pi-sliders-h', route: '/fees/discounts' },
  ];
}
