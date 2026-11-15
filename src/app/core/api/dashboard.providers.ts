import { inject, Provider } from '@angular/core';
import { API_CONFIG } from '../config/api.config';
import { DASHBOARD_REPOSITORY } from './dashboard.repository';
import { HttpDashboardRepository } from './http-dashboard.repository';
import { MockDashboardRepository } from './mock-dashboard.repository';
import { SupabaseDashboardRepository } from './supabase-dashboard.repository';

/**
 * Chooses the dashboard data source in one place, so no page imports a
 * concrete repository or repeats the environment check.
 */
export function provideDashboardRepository(): Provider[] {
  return [
    MockDashboardRepository,
    HttpDashboardRepository,
    SupabaseDashboardRepository,
    {
      provide: DASHBOARD_REPOSITORY,
      useFactory: () => {
        const config = inject(API_CONFIG);
        if (config.useMockApi) return inject(MockDashboardRepository);
        return config.backend === 'supabase'
          ? inject(SupabaseDashboardRepository)
          : inject(HttpDashboardRepository);
      },
    },
  ];
}
