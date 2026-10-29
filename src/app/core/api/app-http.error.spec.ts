import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { normalizeHttpError } from './app-http.error';

describe('normalizeHttpError', () => {
  it('preserves backend codes, field errors, and correlation references', () => {
    const normalized = normalizeHttpError(new HttpErrorResponse({ status: 422, headers: new HttpHeaders(), error: { message: 'Validation failed', error: { code: 'VALIDATION_ERROR', correlationId: 'request-123', fields: { mobile: 'Invalid number' } } } }));
    expect(normalized.code).toBe('VALIDATION_ERROR');
    expect(normalized.correlationId).toBe('request-123');
    expect(normalized.fields?.['mobile']).toBe('Invalid number');
  });

  it('provides a useful message for network failures', () => {
    expect(normalizeHttpError(new HttpErrorResponse({ status: 0 })).message).toContain('unreachable');
  });
});
