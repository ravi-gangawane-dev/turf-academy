import { TestBed } from '@angular/core/testing';
import {
  GlobalErrorHandler,
  MONITORING_CONFIG,
  type ErrorMonitoringConfig,
} from './error-monitoring';

function setup(config: Partial<ErrorMonitoringConfig> = {}) {
  TestBed.configureTestingModule({
    providers: [
      GlobalErrorHandler,
      {
        provide: MONITORING_CONFIG,
        useValue: { enabled: true, endpoint: 'https://collector.test/errors', release: '0.1.0', ...config },
      },
    ],
  });
  return { handler: TestBed.inject(GlobalErrorHandler) };
}

describe('GlobalErrorHandler', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('does not send anything when monitoring is disabled', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handler } = setup({ enabled: false });

    handler.handleError(new Error('boom'));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not send when no endpoint is configured', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handler } = setup({ endpoint: '' });

    handler.handleError(new Error('boom'));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts a redacted payload without the query string', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handler } = setup();
    history.replaceState(null, '', '/students?token=secret#frag');

    handler.handleError(new Error('Fee plan failed'));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://collector.test/errors');
    expect(init.credentials).toBe('omit');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      message: 'Fee plan failed',
      release: '0.1.0',
      url: `${location.origin}/students`,
    });
    expect(String(init.body)).not.toContain('token=secret');
    expect(typeof body.occurredAt).toBe('string');
  });

  it('stringifies non-Error values', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handler } = setup();

    handler.handleError('plain string failure');

    const body = JSON.parse(String((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.message).toBe('plain string failure');
  });

  it('deduplicates the same failure and survives a rejected send', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('network down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handler } = setup();

    handler.handleError(new Error('repeat me'));
    handler.handleError(new Error('repeat me'));
    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('still logs to the console when reporting is active', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { handler } = setup();

    handler.handleError(new Error('visible to developers'));

    expect(consoleSpy).toHaveBeenCalled();
  });
});
