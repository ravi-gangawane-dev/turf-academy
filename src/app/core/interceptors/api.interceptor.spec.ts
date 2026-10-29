import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API_CONFIG } from '../config/api.config';
import { apiInterceptor } from './api.interceptor';

describe('apiInterceptor', () => {
  it('adds authentication and correlation headers to API calls only', () => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting(), provideRouter([]),
      { provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: false } },
      { provide: AuthService, useValue: { accessToken: () => 'test-token', refresh: () => of({ accessToken: 'renewed-token', user: { id: 'u1', name: 'Admin', role: 'admin' } }), logout: () => undefined } },
    ] });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    http.get('/api/v1/students').subscribe();
    const apiRequest = controller.expectOne('/api/v1/students');
    expect(apiRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(apiRequest.request.headers.has('X-Correlation-ID')).toBe(true);
    apiRequest.flush({ success: true, message: 'ok', data: [] });
    http.get('/public/config.json').subscribe();
    const publicRequest = controller.expectOne('/public/config.json');
    expect(publicRequest.request.headers.has('Authorization')).toBe(false);
    publicRequest.flush({});
    controller.verify();
  });

  it('refreshes an expired token once and retries the original request', () => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting(), provideRouter([]),
      { provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: false } },
      { provide: AuthService, useValue: { accessToken: () => 'expired-token', refresh: () => of({ accessToken: 'renewed-token', user: { id: 'u1', name: 'Admin', role: 'admin' } }), logout: () => undefined } },
    ] });
    const http = TestBed.inject(HttpClient); const controller = TestBed.inject(HttpTestingController);
    http.get('/api/v1/students').subscribe();
    controller.expectOne('/api/v1/students').flush({ message: 'expired', error: { code: 'TOKEN_EXPIRED' } }, { status: 401, statusText: 'Unauthorized' });
    const retry = controller.expectOne('/api/v1/students');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer renewed-token');
    retry.flush({ success: true, message: 'ok', data: [] }); controller.verify();
  });
});
