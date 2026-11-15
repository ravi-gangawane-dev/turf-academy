import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionTab, SectionTabs } from '../../shared/section-tabs/section-tabs';

@Component({
  selector: 'app-fee-view-navigation',
  imports: [SectionTabs],
  template: `<app-section-tabs [tabs]="views" ariaLabel="Fee views" />`,
  styleUrl: './fee-view-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeeViewNavigation {
  protected readonly views: readonly SectionTab[] = [
    { label: 'Fees', icon: 'pi-wallet', path: '/fees' },
    { label: 'Fee Plans', icon: 'pi-list', path: '/fees/plans' },
    { label: 'Fee Adjustments', icon: 'pi-sliders-h', path: '/fees/discounts' },
  ];
}
