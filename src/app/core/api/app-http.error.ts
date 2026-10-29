import { HttpErrorResponse } from '@angular/common/http';

export class AppHttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly correlationId?: string, readonly fields?: Readonly<Record<string, string>>) { super(message); this.name = 'AppHttpError'; }
}

export function normalizeHttpError(error: unknown): AppHttpError {
  if (error instanceof AppHttpError) return error;
  if (error instanceof HttpErrorResponse) {
    const payload = error.error as { message?: string; error?: { code?: string; correlationId?: string; fields?: Record<string, string> } } | undefined;
    const fallback = error.status === 0 ? 'The server is unreachable. Check your connection.' : error.status >= 500 ? 'The server could not complete the request.' : 'The request could not be completed.';
    return new AppHttpError(error.status, payload?.error?.code ?? `HTTP_${error.status || 'NETWORK'}`, payload?.message ?? fallback, payload?.error?.correlationId ?? error.headers.get('X-Correlation-ID') ?? undefined, payload?.error?.fields);
  }
  return new AppHttpError(0, 'UNKNOWN', error instanceof Error ? error.message : 'An unexpected error occurred.');
}
