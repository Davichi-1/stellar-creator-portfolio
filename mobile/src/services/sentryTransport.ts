/**
 * Sentry envelope transport (Issue #1389).
 *
 * `SentryErrorTracker.sendToSentry` was a no-op that logged the DSN and
 * returned. Every crash the app captured was discarded, so the tracker
 * reported success while transmitting nothing.
 *
 * This sends events over Sentry's HTTP envelope API directly rather than
 * pulling in `@sentry/react-native`. Two reasons:
 *
 *   - The native SDK needs a config-plugin rebuild of the Expo app, which is a
 *     release-process change rather than a code one, and cannot be verified in
 *     the same PR that writes it.
 *   - The envelope format is stable, documented, and a POST — the existing
 *     `CrashMetrics` shape maps onto it without restructuring.
 *
 * If the native SDK is adopted later, this module is the only thing to delete:
 * nothing else knows the wire format.
 *
 * @see https://develop.sentry.dev/sdk/envelopes/
 */

import type { CrashMetrics, SentryConfig } from '../types/sentry';

interface ParsedDsn {
  envelopeUrl: string;
  publicKey: string;
}

/**
 * Splits a DSN into the envelope endpoint and the public key.
 *
 * A DSN looks like `https://<key>@<host>/<project_id>`, and the envelope
 * endpoint is `https://<host>/api/<project_id>/envelope/`. Returns null on
 * anything malformed rather than throwing — a bad DSN must not make the app
 * crash while reporting a crash.
 */
export function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+/, '');
    if (!url.username || !projectId) return null;

    return {
      envelopeUrl: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      publicKey: url.username,
    };
  } catch {
    return null;
  }
}

/** Sentry's severity levels. Ours map 1:1 except `fatal`, which it shares. */
function toSentryLevel(level: CrashMetrics['severityLevel']): string {
  return level;
}

/**
 * Builds the newline-delimited envelope body.
 *
 * Three lines: envelope header, item header, item payload. The item header's
 * `length` is omitted deliberately — it is optional when the payload is the
 * last line, and computing a byte length that disagrees with the payload is a
 * silent rejection that is unpleasant to debug.
 */
export function buildEnvelope(event: CrashMetrics, config: SentryConfig): string {
  const eventId = event.errorId.replace(/-/g, '').padEnd(32, '0').slice(0, 32);
  const sentAt = new Date().toISOString();

  const envelopeHeader = {
    event_id: eventId,
    sent_at: sentAt,
  };

  const payload = {
    event_id: eventId,
    timestamp: event.timestamp / 1000,
    platform: 'javascript',
    level: toSentryLevel(event.severityLevel),
    environment: config.environment,
    exception: {
      values: [
        {
          type: event.errorType,
          value: event.errorMessage,
          // Sent as a raw string; Sentry parses common formats server-side.
          // Hand-parsing React Native stack frames here would be a second
          // source of truth for something Sentry already does better.
          stacktrace: event.stackTrace ? { frames: [], raw: event.stackTrace } : undefined,
        },
      ],
    },
    breadcrumbs: event.breadcrumbs?.map((crumb) => ({
      timestamp: crumb.timestamp / 1000,
      category: crumb.category,
      message: crumb.message,
      level: crumb.level,
      data: crumb.data,
    })),
    user: event.context.userId ? { id: event.context.userId } : undefined,
    tags: {
      screen: event.context.screen,
      action: event.context.action,
    },
    extra: event.context.metadata,
    ...config.initialScope,
  };

  return [
    JSON.stringify(envelopeHeader),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(payload),
  ].join('\n');
}

export interface TransportResult {
  ok: boolean;
  status?: number;
  error?: string;
}

const TRANSPORT_TIMEOUT_MS = 10_000;

/**
 * POSTs one event to Sentry.
 *
 * Never throws. This is called from the crash path, and an exception raised
 * while reporting an exception either masks the original error or takes the app
 * down with it — both worse than losing one report.
 */
export async function sendEnvelope(
  event: CrashMetrics,
  config: SentryConfig,
): Promise<TransportResult> {
  const parsed = parseDsn(config.dsn);
  if (!parsed) {
    return { ok: false, error: 'Malformed Sentry DSN' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSPORT_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.envelopeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        // `sentry_client` identifies the transport in Sentry's own UI, which is
        // how you tell these events from ones a native SDK would send.
        'X-Sentry-Auth': [
          'Sentry sentry_version=7',
          'sentry_client=creator-portfolio-mobile/1.0',
          `sentry_key=${parsed.publicKey}`,
        ].join(', '),
      },
      body: buildEnvelope(event, config),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, status: response.status, error: `Sentry rejected the event (${response.status})` };
    }

    return { ok: true, status: response.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Sentry transport failed',
    };
  } finally {
    clearTimeout(timer);
  }
}
