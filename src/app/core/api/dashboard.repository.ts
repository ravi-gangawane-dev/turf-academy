import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardSummary } from '../models/dashboard.model';

export interface DashboardRepository {
  getSummary(): Observable<DashboardSummary>;
}

export const DASHBOARD_REPOSITORY = new InjectionToken<DashboardRepository>(
  'DashboardRepository',
);
