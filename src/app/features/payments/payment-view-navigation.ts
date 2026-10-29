import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-payment-view-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="payment-view-actions" aria-label="Payment views">
      @for (view of views; track view.route) {
        @if (!view.adminOnly || auth.role() === 'admin') {
          <a [routerLink]="view.route" routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">
            <i [class]="'pi ' + view.icon" aria-hidden="true"></i>
            {{ view.label }}
          </a>
        }
      }
    </nav>
  `,
  styleUrl: './payment-view-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentViewNavigation {
  protected readonly auth = inject(AuthService);
  protected readonly views = [
    { label: 'Payment History', icon: 'pi-history', route: '/payments', adminOnly: false },
    { label: 'Record Payment', icon: 'pi-plus', route: '/payments/new', adminOnly: false },
    { label: 'Partially Paid', icon: 'pi-clock', route: '/payments/partial', adminOnly: false },
    { label: 'Fully Paid', icon: 'pi-check-circle', route: '/payments/full', adminOnly: false },
    { label: 'Receipts', icon: 'pi-receipt', route: '/payments/receipts', adminOnly: false },
    { label: 'Transaction History', icon: 'pi-arrow-right-arrow-left', route: '/payments/history', adminOnly: false },
    { label: 'Refunds', icon: 'pi-undo', route: '/payments/refunds', adminOnly: true },
  ];
}
