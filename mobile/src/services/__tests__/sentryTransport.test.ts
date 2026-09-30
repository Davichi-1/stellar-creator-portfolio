/**
 * Unit tests for the Sentry envelope transport (Issue #1389).
 */

import { buildEnvelope, parseDsn, sendEnvelope } from '../sentryTransport';
import type { CrashMetrics, SentryConfig } from '../../types/sentry';

const DSN = 'https://abc123def456@o12345.ingest.sentry.io/7654321';

const config: SentryConfig = {
  dsn: DSN,
  enableDebug: false,
  environment: 'test',
  maxBreadcrumbs: 20,
  tracesSampleRate: 1,
};

const crash: CrashMetrics = {
  timestamp: 1_700_000_000_000,
  errorId: 'err-1234',
  errorType: 'TypeError',
  errorMessage: "Cannot read property 'x' of undefined",
  stackTrace: 'at Foo (app.js:1:1)',
  context: { userId: 'u1', screen: 'Wallet', action: 'send' },
  severityLevel: 'fatal',
  breadcrumbs: [
    { timestamp: 1_699_999_999_000, category: 'nav', message: 'to Wallet', level: 'info' },
  ],
};

describe('parseDsn', () => {
  it('derives the envelope endpoint and public key', () => {
    expect(parseDsn(DSN)).toEqual({
      envelopeUrl: 'https://o12345.ingest.sentry.io/api/7654321/envelope/',
      publicKey: 'abc123def456',
    });
  });

  it('returns null rather than throwing on a malformed DSN', () => {
    // A bad DSN must not make the app crash while reporting a crash.
    expect(parseDsn('not-a-url')).toBeNull();
    expect(parseDsn('https://o12345.ingest.sentry.io/7654321')).toBeNull(); // no key
    expect(parseDsn('https://key@o12345.ingest.sentry.io')).toBeNull(); // no project
    expect(parseDsn('')).toBeNull();
  });
});

describe('buildEnvelope', () => {
  it('produces three newline-delimited JSON lines', () => {
    const lines = buildEnvelope(crash, config).split('\n');
    expect(lines).toHaveLength(3);
    lines.forEach((line) => expect(() => JSON.parse(line)).not.toThrow());
  });

  it('declares the item as an event', () => {
    const [, itemHeader] = buildEnvelope(crash, config).split('\n');
    expect(JSON.parse(itemHeader!)).toEqual({ type: 'event' });
  });

  it('normalises the event id to 32 hex-ish characters', () => {
    // Sentry rejects an event_id that is not 32 characters.
    const [header] = buildEnvelope(crash, config).split('\n');
    expect(JSON.parse(header!).event_id).toHaveLength(32);
  });

  it('converts timestamps from milliseconds to seconds', () => {
    // Sentry expects seconds; sending milliseconds dates every event to the
    // year 55000 and they silently sort wrong.
    const payload = JSON.parse(buildEnvelope(crash, config).split('\n')[2]!);
    expect(payload.timestamp).toBe(1_700_000_000);
    expect(payload.breadcrumbs[0].timestamp).toBe(1_699_999_999);
  });

  it('carries the exception type, message and stack', () => {
    const payload = JSON.parse(buildEnvelope(crash, config).split('\n')[2]!);
    const value = payload.exception.values[0];
    expect(value.type).toBe('TypeError');
    expect(value.value).toContain('Cannot read property');
    expect(value.stacktrace.raw).toBe('at Foo (app.js:1:1)');
  });

  it('maps context onto user, tags and extra', () => {
    const payload = JSON.parse(buildEnvelope(crash, config).split('\n')[2]!);
    expect(payload.user).toEqual({ id: 'u1' });
    expect(payload.tags.screen).toBe('Wallet');
    expect(payload.tags.action).toBe('send');
    expect(payload.environment).toBe('test');
  });

  it('preserves the severity level', () => {
    const payload = JSON.parse(buildEnvelope(crash, config).split('\n')[2]!);
    expect(payload.level).toBe('fatal');
  });

  it('omits the user when no userId is known', () => {
    const anonymous = { ...crash, context: {} };
    const payload = JSON.parse(buildEnvelope(anonymous, config).split('\n')[2]!);
    expect(payload.user).toBeUndefined();
  });
});

describe('sendEnvelope', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('POSTs to the envelope endpoint with the auth header', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendEnvelope(crash, config);

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://o12345.ingest.sentry.io/api/7654321/envelope/');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/x-sentry-envelope');
    expect(init.headers['X-Sentry-Auth']).toContain('sentry_key=abc123def456');
    expect(init.headers['X-Sentry-Auth']).toContain('sentry_version=7');
  });

  it('reports a rejection without throwing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 }) as unknown as typeof fetch;

    const result = await sendEnvelope(crash, config);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(429);
  });

  it('never throws when the network fails', async () => {
    // Called from the crash path: an exception raised while reporting an
    // exception either masks the original error or takes the app down with it.
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    await expect(sendEnvelope(crash, config)).resolves.toEqual(
      expect.objectContaining({ ok: false, error: 'offline' }),
    );
  });

  it('refuses a malformed DSN without attempting a request', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendEnvelope(crash, { ...config, dsn: 'nope' });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Malformed/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
