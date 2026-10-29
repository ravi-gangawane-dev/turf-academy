import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiResponse, API_CONFIG } from '../config/api.config';
import { DashboardSummary } from '../models/dashboard.model';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class HttpDashboardRepository implements DashboardRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<ApiResponse<DashboardSummary>>(`${this.config.baseUrl}/dashboard/summary`).pipe(map((response) => response.data));
  }
}
