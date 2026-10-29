import { TableTools } from '../../shared/data-table/table-tools';
import { PageHero } from '../../shared/page-hero/page-hero';
import { AsyncState } from '../../shared/async-state/async-state';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AcademyFacade } from '../../core/state/academy.facade';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';

@Component({ selector: 'app-module-page', imports: [TableTools, PageHero, AsyncState, StatusBadge, AcademyMoneyPipe, DatePipe, TitleCasePipe, SummaryMetricCard], templateUrl: './module-page.html', styleUrl: './module-page.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class ModulePage {
  protected readonly store = inject(AcademyFacade);
  private readonly route = inject(ActivatedRoute);
  protected readonly section = String(this.route.snapshot.data['section'] ?? 'Academy');
  protected readonly title = String(this.route.snapshot.data['title'] ?? 'Workspace');
  protected readonly description = String(this.route.snapshot.data['description'] ?? `Manage ${this.title.toLowerCase()} in one place.`);
  protected readonly icon = String(this.route.snapshot.data['icon'] ?? 'pi-th-large');
  protected readonly availability = String(this.route.snapshot.data['availability'] ?? 'backend');
  protected readonly paymentMetrics = computed(() => ({
    collected: this.store.payments().reduce((sum, item) => sum + item.amountPaise, 0),
    outstanding: this.store.feeRows().reduce((sum, item) => sum + item.balancePaise, 0),
    transactions: this.store.payments().length,
    overdue: this.store.feeRows().filter((item) => item.status === 'Overdue').length,
  }));
  protected readonly isPayments = this.section === 'Payments';
  protected readonly isFees = this.section === 'Fees';
  protected readonly isNotifications = this.section === 'Notifications';
  protected readonly isSettings = this.section === 'Settings';
  protected readonly isLibrary = ['Cover', 'Foundations', 'Components', 'Developer Handoff'].includes(this.section);
}
