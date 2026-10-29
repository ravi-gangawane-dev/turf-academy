import { PageHero } from '../../shared/page-hero/page-hero';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, startWith } from 'rxjs';
import { DASHBOARD_REPOSITORY } from '../../core/api/dashboard.repository';
import { MockDashboardRepository } from '../../core/api/mock-dashboard.repository';
import { HttpDashboardRepository } from '../../core/api/http-dashboard.repository';
import { API_CONFIG } from '../../core/config/api.config';
import { AuthService } from '../../core/auth/auth.service';
import { SupabaseDashboardRepository } from '../../core/api/supabase-dashboard.repository';
import { RecentActivity } from './recent-activity';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';

@Component({
  selector: 'app-dashboard-page',
  imports: [PageHero, AsyncPipe, AcademyMoneyPipe, RecentActivity, SummaryMetricCard],
  providers: [
    MockDashboardRepository,
    HttpDashboardRepository,
    SupabaseDashboardRepository,
    { provide: DASHBOARD_REPOSITORY, useFactory: () => { const config = inject(API_CONFIG); return config.useMockApi ? inject(MockDashboardRepository) : config.backend === 'supabase' ? inject(SupabaseDashboardRepository) : inject(HttpDashboardRepository); } },
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected chartHeight(value:number,values:readonly number[]):number{return Math.max(0,value/Math.max(1,...values)*100);}
  protected attendanceValues(rows:readonly {count:number}[]):number[]{return rows.map(r=>Number(r.count));}
  protected collectionValues(rows:readonly {amount:number}[]):number[]{return rows.map(r=>Number(r.amount));}
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
