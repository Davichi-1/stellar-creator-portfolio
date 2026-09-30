/**
 * useCache
 *
 * Declarative caching hook for React components.
 * Automatically manages cache reads, writes, and invalidation.
 *
 * Features:
 *  - Automatic cache management
 *  - TTL control
 *  - Cache invalidation on demand
 *  - Staleness detection
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { cacheGet, cacheSet, cacheInvalidate, cacheGetOrFetch, CacheResult } from '../services/CachingService';
import { useToast } from '../context/ToastContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface UseCacheOptions {
  /**
   * TTL in milliseconds (default: 5 minutes)
   */
  ttl?: number;
  /**
   * Cache key (generated if not provided)
   */
  key?: string;
}

export interface UseCacheReturn<T> {
  data: T | undefined;
  isStale: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  set: (data: T) => Promise<void>;
  invalidate: () => Promise<void>;
  cachedAt: Date | null;
  accessedAt: Date | null;
}

// ─── Hook Implementation ───────────────────────────────────────────────────────

export function useCache<T>(
  key: string,
  fetcher?: () => Promise<T>,
  options: UseCacheOptions = {},
): UseCacheReturn<T> {
  const { ttl = 5 * 60 * 1000, key: cacheKey = key } = options;
  const { showError } = useToast();
  const [data, setData] = useState<T | undefined>(undefined);
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);
  const [accessedAt, setAccessedAt] = useState<Date | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Load from cache on mount ────────────────────────────────────────────────

  useEffect(() => {
    if (!isMounted.current) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const cached = await cacheGet<T>(cacheKey);
        if (cached && !cached.isStale) {
          setData(cached.data);
          setIsStale(false);
          setCachedAt(cached.cachedAt);
          setAccessedAt(cached.accessedAt ?? null);
        } else if (fetcher) {
          await fetchAndSet();
        }
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

    loadData();
  }, [cacheKey, fetcher]);

  // ── Fetch and set ────────────────────────────────────────────────────────────

  const fetchAndSet = useCallback(async () => {
    if (!isMounted.current || !fetcher) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await cacheGetOrFetch<T>(cacheKey, ttl, fetcher);
      if (!isMounted.current) return;

      setData(result.data);
      setIsStale(result.isStale);
      setCachedAt(result.cachedAt);
      setAccessedAt(result.accessedAt ?? null);
    } catch (err) {
      if (!isMounted.current) return;

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (showError) showError('Cache Error', error.message);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [cacheKey, ttl, fetcher, showError]);

  // ── Public methods ──────────────────────────────────────────────────────────

  const refetch = useCallback(async (force = false) => {
    if (!isMounted.current || !fetcher) return;

    setIsLoading(true);
    setError(null);

    try {
      const fresh = await fetcher();
      if (!isMounted.current) return;

      await cacheSet(cacheKey, fresh, ttl);
      setData(fresh);
      setIsStale(false);
      setCachedAt(new Date());
      setAccessedAt(new Date());
    } catch (err) {
      if (!isMounted.current) return;

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (showError) showError('Cache Error', error.message);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [cacheKey, ttl, fetcher, showError]);

  const set = useCallback(async (value: T) => {
    if (!isMounted.current) return;
    await cacheSet(cacheKey, value, ttl);
    setData(value);
    setIsStale(false);
    setCachedAt(new Date());
    setAccessedAt(new Date());
  }, [cacheKey, ttl]);

  const invalidate = useCallback(async () => {
    if (!isMounted.current) return;
    await cacheInvalidate(cacheKey);
    setData(undefined);
    setIsStale(false);
    setCachedAt(null);
    setAccessedAt(null);
  }, [cacheKey]);

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    data,
    isStale,
    isLoading,
    error,
    refetch,
    set,
    invalidate,
    cachedAt,
    accessedAt,
  };
}
