import { PageHero } from '../../shared/page-hero/page-hero';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { AsyncPipe } from '@angular/common';
import { AcademyDatePipe } from '../../shared/academy-date.pipe';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, startWith } from 'rxjs';
import { DASHBOARD_REPOSITORY } from '../../core/api/dashboard.repository';
import { provideDashboardRepository } from '../../core/api/dashboard.providers';
import { AuthService } from '../../core/auth/auth.service';
import { RecentActivity } from './recent-activity';
import { SummaryCards } from '../../shared/summary-cards/summary-cards';

@Component({
  selector: 'app-dashboard-page',
  imports: [PageHero, AsyncPipe, AcademyDatePipe, AcademyMoneyPipe, RecentActivity, SummaryCards],
  providers: [provideDashboardRepository()],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected total(values: readonly number[]): number { return values.reduce((sum, value) => sum + value, 0); }
  protected chartHeight(value: number, values: readonly number[]): number { return Math.max(0, value / Math.max(1, ...values) * 100); }
  protected attendanceValues(rows: readonly { count: number }[]): number[] { return rows.map(r => Number(r.count)); }
  protected collectionValues(rows: readonly { amount: number }[]): number[] { return rows.map(r => Number(r.amount)); }
  private readonly repository = inject(DASHBOARD_REPOSITORY);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly greeting = new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening';
  protected readonly state$ = this.repository.getSummary().pipe(
    map((data) => ({ status: 'ready' as const, ...data })),
    catchError(() => of({ status: 'error' as const, data: null })),
    startWith({ status: 'loading' as const, data: null }),
  );

  protected navigate(route: string): void { void this.router.navigateByUrl(route); }
}
