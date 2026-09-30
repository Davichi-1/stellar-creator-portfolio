/**
 * Crash metrics aggregation (Issue #1389).
 *
 * `SentryErrorTracker` records individual crashes. It has no notion of a rate,
 * so there was no answer to the question anyone actually asks after a release:
 * "is this build crashing more than the last one?"
 *
 * This aggregates the raw crash stream into the metrics that answer it:
 *
 *   - **Crash-free session rate** — the headline mobile stability number, and
 *     the one release gates are written against.
 *   - **Crash-free user rate** — the same figure weighted per user, which is
 *     what separates "one user in a crash loop" from "everybody is affected".
 *     A session rate alone cannot tell those apart, and they need opposite
 *     responses.
 *   - **Counts grouped by error type** — so the worst offender is obvious
 *     without reading the stream.
 *
 * Counters are held in memory with a bounded window. Persisting them is the
 * caller's job: a mobile process can be killed at any moment, so anything that
 * must survive that has to be written as it happens, and choosing where is a
 * storage decision this module should not make.
 */

import type { CrashMetrics } from '../types/sentry';

/** A session is fatal-crash-free or it is not; that is the unit of the rate. */
interface SessionRecord {
  sessionId: string;
  userId?: string;
  startedAt: number;
  crashed: boolean;
}

export interface CrashMetricsSnapshot {
  /** 0–1. `1` when no session has crashed, including when there are none. */
  crashFreeSessionRate: number;
  /** 0–1, weighted per distinct user rather than per session. */
  crashFreeUserRate: number;
  totalSessions: number;
  crashedSessions: number;
  totalUsers: number;
  affectedUsers: number;
  /** Every captured event, fatal or not. */
  totalEvents: number;
  /** Only `fatal` events — what the crash-free rates are computed from. */
  fatalEvents: number;
  /** Event counts by `errorType`, descending. */
  byErrorType: Array<{ errorType: string; count: number }>;
  /** Event counts by severity. */
  bySeverity: Record<string, number>;
  /** Oldest event still inside the window, or null when empty. */
  windowStartedAt: number | null;
}

/**
 * Sessions retained. Beyond this the oldest are dropped.
 *
 * A window rather than an all-time total on purpose: an all-time crash-free
 * rate is dominated by history and barely moves when a new release starts
 * crashing, which is exactly when the number needs to move.
 */
const MAX_SESSIONS = 500;

/** Events retained for the grouped counts. */
const MAX_EVENTS = 1_000;

export class CrashMetricsAggregator {
  private sessions: SessionRecord[] = [];
  private events: CrashMetrics[] = [];
  private currentSessionId: string | null = null;

  /**
   * Opens a session. Call on app start and on foreground-after-background.
   *
   * A session that is never closed still counts — a process killed by the OS
   * for memory pressure is a real stability signal, and dropping unclosed
   * sessions would quietly exclude the worst ones.
   */
  public startSession(sessionId: string, userId?: string): void {
    this.currentSessionId = sessionId;
    this.sessions.push({
      sessionId,
      userId,
      startedAt: Date.now(),
      crashed: false,
    });

    if (this.sessions.length > MAX_SESSIONS) {
      this.sessions.splice(0, this.sessions.length - MAX_SESSIONS);
    }
  }

  /** Closes the current session without marking it crashed. */
  public endSession(): void {
    this.currentSessionId = null;
  }

  /**
   * Records an event against the current session.
   *
   * Only `fatal` marks the session crashed. A handled error is worth counting
   * but does not make the session unstable — conflating the two makes the
   * crash-free rate track logging volume instead of stability.
   */
  public record(event: CrashMetrics): void {
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS);
    }

    if (event.severityLevel !== 'fatal') return;

    const session = this.currentSessionId
      ? this.sessions.find((s) => s.sessionId === this.currentSessionId)
      : this.sessions[this.sessions.length - 1];

    if (session) session.crashed = true;
  }

  public snapshot(): CrashMetricsSnapshot {
    const totalSessions = this.sessions.length;
    const crashedSessions = this.sessions.filter((s) => s.crashed).length;

    const users = new Set<string>();
    const affected = new Set<string>();
    for (const session of this.sessions) {
      if (!session.userId) continue;
      users.add(session.userId);
      if (session.crashed) affected.add(session.userId);
    }

    const byType = new Map<string, number>();
    const bySeverity: Record<string, number> = {};
    for (const event of this.events) {
      byType.set(event.errorType, (byType.get(event.errorType) ?? 0) + 1);
      bySeverity[event.severityLevel] = (bySeverity[event.severityLevel] ?? 0) + 1;
    }

    return {
      // No sessions means nothing has crashed, so the rate is 1 rather than
      // NaN. A dashboard showing NaN on a fresh install reads as broken
      // instrumentation.
      crashFreeSessionRate:
        totalSessions === 0 ? 1 : (totalSessions - crashedSessions) / totalSessions,
      crashFreeUserRate:
        users.size === 0 ? 1 : (users.size - affected.size) / users.size,
      totalSessions,
      crashedSessions,
      totalUsers: users.size,
      affectedUsers: affected.size,
      totalEvents: this.events.length,
      fatalEvents: this.events.filter((e) => e.severityLevel === 'fatal').length,
      byErrorType: [...byType.entries()]
        .map(([errorType, count]) => ({ errorType, count }))
        .sort((a, b) => b.count - a.count),
      bySeverity,
      windowStartedAt: this.events.length > 0 ? this.events[0]!.timestamp : null,
    };
  }

  /** Clears the window. Used after a successful flush, and by tests. */
  public reset(): void {
    this.sessions = [];
    this.events = [];
    this.currentSessionId = null;
  }
}
