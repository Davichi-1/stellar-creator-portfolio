/**
 * Unit tests for crash metrics aggregation (Issue #1389).
 */

import { CrashMetricsAggregator } from '../CrashMetricsAggregator';
import type { CrashMetrics } from '../../types/sentry';

function event(
  severityLevel: CrashMetrics['severityLevel'],
  errorType = 'TypeError',
): CrashMetrics {
  return {
    timestamp: Date.now(),
    errorId: Math.random().toString(36).slice(2),
    errorType,
    errorMessage: 'boom',
    context: {},
    severityLevel,
  };
}

describe('CrashMetricsAggregator', () => {
  let agg: CrashMetricsAggregator;

  beforeEach(() => {
    agg = new CrashMetricsAggregator();
  });

  it('reports a crash-free rate of 1 with no data, not NaN', () => {
    // A dashboard showing NaN on a fresh install reads as broken
    // instrumentation rather than as a healthy app.
    const snap = agg.snapshot();
    expect(snap.crashFreeSessionRate).toBe(1);
    expect(snap.crashFreeUserRate).toBe(1);
    expect(snap.totalSessions).toBe(0);
  });

  it('keeps a session crash-free when only handled errors occur', () => {
    // Conflating handled errors with crashes makes the rate track logging
    // volume instead of stability.
    agg.startSession('s1', 'u1');
    agg.record(event('error'));
    agg.record(event('warning'));

    const snap = agg.snapshot();
    expect(snap.crashFreeSessionRate).toBe(1);
    expect(snap.crashedSessions).toBe(0);
    expect(snap.totalEvents).toBe(2);
    expect(snap.fatalEvents).toBe(0);
  });

  it('marks a session crashed on a fatal event', () => {
    agg.startSession('s1', 'u1');
    agg.record(event('fatal'));

    const snap = agg.snapshot();
    expect(snap.crashedSessions).toBe(1);
    expect(snap.crashFreeSessionRate).toBe(0);
    expect(snap.fatalEvents).toBe(1);
  });

  it('computes a crash-free session rate across several sessions', () => {
    for (const id of ['s1', 's2', 's3', 's4']) {
      agg.startSession(id, `user-${id}`);
      if (id === 's2') agg.record(event('fatal'));
    }

    expect(agg.snapshot().crashFreeSessionRate).toBe(0.75);
  });

  it('separates one user crash-looping from everybody crashing', () => {
    // The session rate cannot tell these apart, and they need opposite
    // responses — which is why the user rate exists.
    for (let i = 0; i < 4; i += 1) {
      agg.startSession(`s${i}`, 'unlucky-user');
      agg.record(event('fatal'));
    }
    agg.startSession('s4', 'happy-user');

    const snap = agg.snapshot();
    expect(snap.crashFreeSessionRate).toBe(0.2); // 1 of 5 sessions clean
    expect(snap.crashFreeUserRate).toBe(0.5); // but only 1 of 2 users affected
    expect(snap.affectedUsers).toBe(1);
    expect(snap.totalUsers).toBe(2);
  });

  it('groups counts by error type, worst first', () => {
    agg.startSession('s1', 'u1');
    agg.record(event('error', 'NetworkError'));
    agg.record(event('error', 'NetworkError'));
    agg.record(event('error', 'NetworkError'));
    agg.record(event('fatal', 'TypeError'));

    const byType = agg.snapshot().byErrorType;
    expect(byType[0]).toEqual({ errorType: 'NetworkError', count: 3 });
    expect(byType[1]).toEqual({ errorType: 'TypeError', count: 1 });
  });

  it('counts events by severity', () => {
    agg.startSession('s1');
    agg.record(event('fatal'));
    agg.record(event('error'));
    agg.record(event('error'));
    agg.record(event('info'));

    expect(agg.snapshot().bySeverity).toEqual({ fatal: 1, error: 2, info: 1 });
  });

  it('attributes a fatal to the current session, not the first one', () => {
    agg.startSession('s1', 'u1');
    agg.startSession('s2', 'u2');
    agg.record(event('fatal'));

    const snap = agg.snapshot();
    expect(snap.crashedSessions).toBe(1);
    expect(snap.affectedUsers).toBe(1);
    // u2 is the one in trouble, not u1.
    expect(snap.crashFreeUserRate).toBe(0.5);
  });

  it('still records a fatal after endSession, against the last session', () => {
    // A process killed by the OS never closes its session cleanly; dropping
    // those would exclude exactly the worst cases.
    agg.startSession('s1', 'u1');
    agg.endSession();
    agg.record(event('fatal'));

    expect(agg.snapshot().crashedSessions).toBe(1);
  });

  it('ignores sessions with no user when computing the user rate', () => {
    agg.startSession('anon-1');
    agg.record(event('fatal'));

    const snap = agg.snapshot();
    expect(snap.crashedSessions).toBe(1);
    // No identified users, so the user rate has no denominator.
    expect(snap.totalUsers).toBe(0);
    expect(snap.crashFreeUserRate).toBe(1);
  });

  it('bounds the session window so the rate stays responsive', () => {
    // An all-time rate barely moves when a new release starts crashing, which
    // is when it most needs to.
    for (let i = 0; i < 600; i += 1) {
      agg.startSession(`s${i}`, `u${i}`);
    }
    expect(agg.snapshot().totalSessions).toBe(500);
  });

  it('bounds the event window', () => {
    agg.startSession('s1');
    for (let i = 0; i < 1_200; i += 1) {
      agg.record(event('error'));
    }
    expect(agg.snapshot().totalEvents).toBe(1_000);
  });

  it('clears everything on reset', () => {
    agg.startSession('s1', 'u1');
    agg.record(event('fatal'));
    agg.reset();

    const snap = agg.snapshot();
    expect(snap.totalSessions).toBe(0);
    expect(snap.totalEvents).toBe(0);
    expect(snap.crashFreeSessionRate).toBe(1);
  });
});
