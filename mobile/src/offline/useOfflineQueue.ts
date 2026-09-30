/**
 * useOfflineQueue
 *
 * Convenience hook for queue status management.
 * Provides quick access to queue statistics without manual API calls.
 */

import { useState, useEffect, useCallback } from 'react';
import { getRetryableOps, getDeadLetterOps, pendingCount, deadLetterCount } from './OfflineQueue';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OfflineQueueStatus {
  hasPending: boolean;
  hasDeadLetter: boolean;
  pendingCount: number;
  deadLetterCount: number;
}

// ─── Hook Implementation ───────────────────────────────────────────────────────

export function useOfflineQueue() {
  const [status, setStatus] = useState<OfflineQueueStatus>({
    hasPending: false,
    hasDeadLetter: false,
    pendingCount: 0,
    deadLetterCount: 0,
  });

  // ── Load queue status ──────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    const [pending, dlq] = await Promise.all([
      pendingCount(),
      deadLetterCount(),
    ]);
    setStatus({
      hasPending: pending > 0,
      hasDeadLetter: dlq > 0,
      pendingCount: pending,
      deadLetterCount: dlq,
    });
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // ── Return ─────────────────────────────────────────────────────────────────

  return status;
}
