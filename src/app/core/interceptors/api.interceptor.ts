import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API_CONFIG } from '../config/api.config';
import { normalizeHttpError } from '../api/app-http.error';

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(API_CONFIG);
  if (!request.url.startsWith(config.baseUrl)) return next(request);
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.accessToken();
  const correlationId = globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}`;
  const authorizedRequest = request.clone({ setHeaders: {
    'X-Correlation-ID': correlationId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } });
  return next(authorizedRequest).pipe(catchError((error: unknown) => {
    const normalized = normalizeHttpError(error);
    const isAuthEndpoint = request.url.includes('/auth/login') || request.url.includes('/auth/refresh-token');
    if (normalized.status !== 401 || isAuthEndpoint || !auth.accessToken()) return throwError(() => normalized);
    return auth.refresh().pipe(
      switchMap((session) => next(authorizedRequest.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } }))),
      catchError((refreshError: unknown) => { void auth.logout(); void router.navigateByUrl('/auth/session-expired'); return throwError(() => normalizeHttpError(refreshError)); }),
    );
  }));
};
