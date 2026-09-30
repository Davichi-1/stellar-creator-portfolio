/**
 * Sentry Error Tracking Service
 * Handles crash tracking, error monitoring, and performance metrics
 */

import {
  ErrorContext,
  CrashMetrics,
  BreadcrumbData,
  PerformanceMetrics,
  SentryConfig,
} from '../types/sentry';
import { CrashMetricsAggregator, type CrashMetricsSnapshot } from './CrashMetricsAggregator';
import { sendEnvelope } from './sentryTransport';

export class SentryErrorTracker {
  private static instance: SentryErrorTracker;
  private config: SentryConfig | null = null;
  private breadcrumbs: BreadcrumbData[] = [];
  private isInitialized: boolean = false;
  private readonly aggregator = new CrashMetricsAggregator();

  private constructor() {}

  /**
   * Initialize Sentry error tracking
   */
  public static initialize(config: SentryConfig): SentryErrorTracker {
    if (!SentryErrorTracker.instance) {
      SentryErrorTracker.instance = new SentryErrorTracker();
    }

    SentryErrorTracker.instance.config = config;
    SentryErrorTracker.instance.isInitialized = true;

    if (config.enableDebug) {
      console.log('[Sentry] Initialized with DSN:', config.dsn);
    }

    return SentryErrorTracker.instance;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SentryErrorTracker {
    if (!SentryErrorTracker.instance) {
      SentryErrorTracker.instance = new SentryErrorTracker();
    }
    return SentryErrorTracker.instance;
  }

  /**
   * Capture exception
   */
  public captureException(error: Error, context: ErrorContext = {}): string {
    if (!this.isInitialized) {
      console.warn('[Sentry] Not initialized, cannot capture exception');
      return '';
    }

    const errorId = this.generateErrorId();
    const metrics: CrashMetrics = {
      timestamp: Date.now(),
      errorId,
      errorType: error.name || 'Unknown',
      errorMessage: error.message,
      stackTrace: error.stack,
      context,
      severityLevel: 'error',
      breadcrumbs: this.getBreadcrumbs(),
    };

    if (this.config?.enableDebug) {
      console.log('[Sentry] Captured exception:', metrics);
    }

    // In a real implementation, this would send to Sentry API
    this.sendToSentry('exception', metrics);

    return errorId;
  }

  /**
   * Capture message
   */
  public captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): string {
    if (!this.isInitialized) {
      console.warn('[Sentry] Not initialized, cannot capture message');
      return '';
    }

    const errorId = this.generateErrorId();
    const metrics: CrashMetrics = {
      timestamp: Date.now(),
      errorId,
      errorType: 'Message',
      errorMessage: message,
      context: {},
      severityLevel: level,
      breadcrumbs: this.getBreadcrumbs(),
    };

    if (this.config?.enableDebug) {
      console.log('[Sentry] Captured message:', metrics);
    }

    this.sendToSentry('message', metrics);

    return errorId;
  }

  /**
   * Add breadcrumb
   */
  public addBreadcrumb(
    message: string,
    category: string = 'action',
    level: string = 'info',
    data?: Record<string, any>,
  ): void {
    if (!this.isInitialized) {
      return;
    }

    const breadcrumb: BreadcrumbData = {
      timestamp: Date.now(),
      category,
      message,
      level,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the last N breadcrumbs
    const maxBreadcrumbs = this.config?.maxBreadcrumbs || 100;
    if (this.breadcrumbs.length > maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-maxBreadcrumbs);
    }

    if (this.config?.enableDebug) {
      console.log('[Sentry] Added breadcrumb:', breadcrumb);
    }
  }

  /**
   * Clear breadcrumbs
   */
  public clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Capture performance metrics
   */
  public capturePerformanceMetrics(metrics: PerformanceMetrics): string {
    if (!this.isInitialized) {
      console.warn('[Sentry] Not initialized, cannot capture performance metrics');
      return '';
    }

    const errorId = this.generateErrorId();

    if (this.config?.enableDebug) {
      console.log('[Sentry] Performance metrics:', metrics);
    }

    this.sendToSentry('performance', {
      errorId,
      metrics,
      timestamp: Date.now(),
    });

    return errorId;
  }

  /**
   * Set user context
   */
  public setUserContext(userId: string, userData?: Record<string, any>): void {
    if (!this.isInitialized) {
      return;
    }

    if (this.config?.enableDebug) {
      console.log('[Sentry] Set user context:', userId);
    }

    // Update initial scope if available
    if (this.config?.initialScope) {
      this.config.initialScope.userId = userId;
      if (userData) {
        this.config.initialScope.userData = userData;
      }
    }
  }

  /**
   * Clear user context
   */
  public clearUserContext(): void {
    if (!this.isInitialized) {
      return;
    }

    if (this.config?.initialScope) {
      delete this.config.initialScope.userId;
      delete this.config.initialScope.userData;
    }
  }

  /**
   * Get breadcrumbs
   */
  private getBreadcrumbs(): BreadcrumbData[] {
    return [...this.breadcrumbs];
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `sentry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send data to Sentry (placeholder for actual implementation)
   */
  /**
   * Transmits an event and folds it into the aggregate metrics (Issue #1389).
   *
   * This was a no-op that logged the DSN, so every captured crash was
   * discarded — the tracker reported success while sending nothing.
   *
   * Deliberately fire-and-forget. `captureException` is called from the crash
   * path and must not become async: awaiting a network round trip there would
   * delay the error boundary's render, and on a fatal error the process may not
   * survive long enough to await anything.
   */
  private sendToSentry(type: string, data: CrashMetrics): void {
    this.aggregator.record(data);

    if (this.config?.enableDebug) {
      console.log(`[Sentry] sending ${type} to`, this.config?.dsn);
    }

    if (!this.config?.dsn) return;

    void sendEnvelope(data, this.config).then((result) => {
      if (!result.ok && this.config?.enableDebug) {
        // Logged rather than retried: a queue of undelivered crash reports is
        // its own subsystem (persistence, backoff, ordering), and a dropped
        // report is a smaller problem than a half-built one.
        console.warn(`[Sentry] delivery failed: ${result.error}`);
      }
    });
  }

  /**
   * Opens a session for crash-free rate tracking.
   *
   * Call on app start and on foreground-after-background. Without sessions the
   * aggregate rates have no denominator and report 1.
   */
  public startSession(sessionId: string, userId?: string): void {
    this.aggregator.startSession(sessionId, userId);
  }

  /** Closes the current session without marking it crashed. */
  public endSession(): void {
    this.aggregator.endSession();
  }

  /**
   * Aggregate crash metrics — crash-free session and user rates, and counts
   * grouped by error type and severity.
   *
   * This is what answers "is this build crashing more than the last one?",
   * which the individual-event stream cannot.
   */
  public getCrashMetrics(): CrashMetricsSnapshot {
    return this.aggregator.snapshot();
  }

  /** Clears the aggregation window. */
  public resetCrashMetrics(): void {
    this.aggregator.reset();
  }

  /**
   * Captures a fatal crash.
   *
   * Distinct from `captureException` because only `fatal` marks a session
   * crashed — conflating handled errors with crashes makes the crash-free rate
   * track logging volume rather than stability.
   */
  public captureFatal(error: Error, context: ErrorContext = {}): string {
    if (!this.isInitialized) {
      console.warn('[Sentry] Not initialized, cannot capture fatal');
      return '';
    }

    const errorId = this.generateErrorId();
    const metrics: CrashMetrics = {
      timestamp: Date.now(),
      errorId,
      errorType: error.name || 'Unknown',
      errorMessage: error.message,
      stackTrace: error.stack,
      context,
      severityLevel: 'fatal',
      breadcrumbs: this.getBreadcrumbs(),
    };

    this.sendToSentry('fatal', metrics);
    return errorId;
  }

  /**
   * Check if initialized
   */
  public isInitializedProperly(): boolean {
    return this.isInitialized && this.config !== null;
  }
}
