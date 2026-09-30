/**
 * useCachedMetrics
 *
 * Specialized hook for rapid revisit of metrics data with high-frequency caching.
 * Uses shorter TTL and optimized caching strategy for metrics.
 *
 * Features:
 *  - 1-minute TTL for metrics
 *  - Automatic cache warming
 *  - Stale-while-revalidate for smooth UX
 *  - Performance analytics integration
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { cacheGetMetrics, cacheSetMetrics, cacheGetOrFetch, CacheResult } from '../services/CachingService';
import { CacheMetricsManager, getStats } from '../services/CacheMetricsManager';
import { useToast } from '../context/ToastContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface UseCachedMetricsReturn<T> {
  data: T | undefined;
  isStale: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
  metrics: {
    hits: number;
    misses: number;
    hitRate: number;
    entries: number;
  };
  lastAccess: Date | null;
}

// ─── Hook Implementation ───────────────────────────────────────────────────────

export function useCachedMetrics<T>(
  key: string,
  fetcher: () => Promise<T>,
): UseCachedMetricsReturn<T> {
  const { showError } = useToast();
  const [data, setData] = useState<T | undefined>(undefined);
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastAccess, setLastAccess] = useState<Date | null>(null);
  const [metrics, setMetrics] = useState({ hits: 0, misses: 0, hitRate: 0, entries: 0 });
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Load from metrics cache on mount ────────────────────────────────────────

  useEffect(() => {
    if (!isMounted.current) return;

    const loadMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const cached = await cacheGetMetrics<T>(key);
        if (cached && !cached.isStale) {
          await CacheMetricsManager.recordHit(key, true, false);
          setData(cached.data);
          setIsStale(false);
          setLastAccess(cached.accessedAt ?? null);
        } else {
          await CacheMetricsManager.recordHit(key, false, false);
          await fetchAndSet();
        }

        // Update metrics
        const stats = await getStats();
        const total = stats.totalRequests;
        const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
        setMetrics({
          hits: stats.hits,
          misses: stats.misses,
          hitRate,
          entries: stats.entries,
        });
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    loadMetrics();
  }, [key, fetcher]);

  // ── Fetch and set with metrics tracking ─────────────────────────────────────

  const fetchAndSet = useCallback(async () => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await cacheGetOrFetch<T>(key, 60_000, fetcher); // 1 min TTL for metrics
      if (!isMounted.current) return;

      await CacheMetricsManager.recordHit(key, true, result.isStale);
      
      setData(result.data);
      setIsStale(result.isStale);
      setLastAccess(result.accessedAt ?? null);

      // Update metrics
      const stats = await getStats();
      const total = stats.totalRequests;
      const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
      setMetrics({
        hits: stats.hits,
        misses: stats.misses,
        hitRate,
        entries: stats.entries,
      });
    } catch (err) {
      if (!isMounted.current) return;

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      await CacheMetricsManager.recordHit(key, false, false);
      if (showError) showError('Cache Error', error.message);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [key, fetcher, showError]);

  // ── Public methods ──────────────────────────────────────────────────────────

  const refetch = useCallback(async () => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const fresh = await fetcher();
      if (!isMounted.current) return;

      await cacheSetMetrics(key, fresh);
      setData(fresh);
      setIsStale(false);
      setLastAccess(new Date());
      await CacheMetricsManager.recordHit(key, true, false);

      // Update metrics
      const stats = await getStats();
      const total = stats.totalRequests;
      const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
      setMetrics({
        hits: stats.hits,
        misses: stats.misses,
        hitRate,
        entries: stats.entries,
      });
    } catch (err) {
      if (!isMounted.current) return;

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      await CacheMetricsManager.recordHit(key, false, false);
      if (showError) showError('Cache Error', error.message);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [key, fetcher, showError]);

  const invalidate = useCallback(async () => {
    if (!isMounted.current) return;
    await CacheMetricsManager.invalidateWithMetrics(`${key}`);
    await cacheSetMetrics(key, undefined as any);
    setData(undefined);
    setIsStale(false);
    setLastAccess(null);
  }, [key]);

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    data,
    isStale,
    isLoading,
    error,
    refetch,
    invalidate,
    metrics,
    lastAccess,
  };
}
