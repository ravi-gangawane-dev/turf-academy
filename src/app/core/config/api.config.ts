import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ApiConfig {
  readonly baseUrl: string;
  readonly useMockApi: boolean;
  readonly allowOfflineAttendance?: boolean;
  readonly backend?: 'mock' | 'rest' | 'supabase';
  readonly supabaseUrl?: string;
  readonly supabaseAnonKey?: string;
  readonly academySupport?: {
    readonly phone: string;
    readonly displayPhone: string;
    readonly email: string;
    readonly whatsapp: string;
    readonly hours: string;
  };
}

export const API_CONFIG = new InjectionToken<ApiConfig>('ApiConfig', {
  providedIn: 'root',
  factory: () => ({
    baseUrl: environment.apiBaseUrl,
    useMockApi: environment.useMockApi,
    allowOfflineAttendance: false,
    backend: environment.backend,
    supabaseUrl: environment.supabaseUrl,
    supabaseAnonKey: environment.supabaseAnonKey,
    academySupport: environment.academySupport,
  }),
});

export interface ApiResponse<T> {
  readonly success: boolean;
  readonly message: string;
  readonly data: T;
}
