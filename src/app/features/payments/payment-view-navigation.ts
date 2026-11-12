import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-payment-view-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="payment-view-actions" aria-label="Payment views">
      @for (view of views; track view.route) {
        <a [routerLink]="view.route" routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">
          <i [class]="'pi ' + view.icon" aria-hidden="true"></i>
          {{ view.label }}
        </a>
      }
    </nav>
  `,
  styleUrl: './payment-view-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentViewNavigation {
  protected readonly views = [
    { label: 'Payments', icon: 'pi-wallet', route: '/payments', adminOnly: false },
  ];
}
