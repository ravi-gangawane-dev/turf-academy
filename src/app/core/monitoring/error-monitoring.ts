import { ErrorHandler, Injectable, InjectionToken, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Runtime configuration for outbound error reporting. */
export interface ErrorMonitoringConfig {
  readonly enabled: boolean;
  /** Collector URL that accepts a JSON `ErrorReportPayload` via POST. Empty disables sending. */
  readonly endpoint: string;
  readonly release: string;
}

export interface ErrorReportPayload {
  readonly message: string;
  readonly stack: string | null;
  /** Origin + path only: query strings and fragments may carry tokens. */
  readonly url: string;
  readonly release: string;
  readonly occurredAt: string;
}

export const MONITORING_CONFIG = new InjectionToken<ErrorMonitoringConfig>(
  'MONITORING_CONFIG',
  { providedIn: 'root', factory: () => environment.monitoring },
);

const MAX_REPORTS_PER_SESSION = 20;

/**
 * Reports uncaught application errors to a collector while keeping the console
 * behaviour developers rely on. Inactive until an endpoint is configured, and
 * never sends cookies, headers, form values or the page query string.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly config = inject(MONITORING_CONFIG);
  private readonly sent = new Set<string>();
  private count = 0;

  handleError(error: unknown): void {
    // Keep the default developer experience (also what CI logs assert on).
    console.error(error);
    if (!this.config.enabled || !this.config.endpoint) return;
    if (this.count >= MAX_REPORTS_PER_SESSION) return;

    const payload = this.toPayload(error);
    // Same failure twice (re-render, retry) must not multiply collector traffic.
    if (this.sent.has(payload.message)) return;
    this.sent.add(payload.message);
    this.count += 1;

    void fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      // Never attach credentials to a third-party collector.
      credentials: 'omit',
    }).catch(() => undefined);
  }

  private toPayload(error: unknown): ErrorReportPayload {
    const normalised = error instanceof Error ? error : new Error(String(error));
    const url = typeof location === 'undefined' ? '' : `${location.origin}${location.pathname}`;
    return {
      message: normalised.message || normalised.name,
      stack: normalised.stack ?? null,
      url,
      release: this.config.release,
      occurredAt: new Date().toISOString(),
    };
  }
}
