/**
 * useOfflineData
 *
 * Seamless offline-first data fetching hook.
 * Returns cached data when offline, fetches fresh data when online,
 * and handles caching automatically.
 *
 * Features:
 *  - Automatic cache management with TTL
 *  - Stale-while-revalidate strategy
 *  - Cache key generation
 *  - Manual cache invalidation
 *  - Error handling for offline scenarios
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCache, setCache, invalidateCache } from './OfflineStore';
import { useNetwork } from './NetworkProvider';
import { useToast } from '../context/ToastContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface UseOfflineDataOptions<T> {
  /**
   * TTL in milliseconds (default: 5 minutes)
   */
  ttl?: number;
  /**
   * Cache key override (generated from URL if not provided)
   */
  cacheKey?: string;
  /**
   * Initial data while fetching
   */
  initialData?: T;
  /**
   * Called when data is successfully fetched
   */
  onSuccess?: (data: T) => void;
  /**
   * Called when fetch fails
   */
  onError?: (error: Error) => void;
  /**
   * Custom fetch function (default: window.fetch)
   */
  fetcher?: (url: string) => Promise<T>;
}

export interface UseOfflineDataResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isStale: boolean;
  cachedAt: Date | null;
  refetch: () => Promise<void>;
  clearCache: () => Promise<void>;
}

// ─── Hook Implementation ───────────────────────────────────────────────────────

export function useOfflineData<T>(
  url: string,
  options: UseOfflineDataOptions<T> = {},
): UseOfflineDataResult<T> {
  const { isOnline } = useNetwork();
  const { showError } = useToast();
  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    cacheKey,
    initialData,
    onSuccess,
    onError,
    fetcher = (u) => fetch(u).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<T>;
    }),
  } = options;

  const key = cacheKey || `api:${url}`;
  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);
  const isMounted = useRef(true);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Load from cache on mount ────────────────────────────────────────────────

  useEffect(() => {
    if (!isMounted.current) return;

    const loadCache = async () => {
      try {
        const cache = await getCache<T>(key);
        if (cache) {
          setData(cache.data);
          setIsStale(cache.isStale);
          setCachedAt(cache.cachedAt);
        }
      } catch (err) {
        console.error(`[useOfflineData] Cache load error for ${key}:`, err);
      }
    };

    loadCache();
  }, [key]);

  // ── Refetch when online or requested ────────────────────────────────────────

  const refetch = useCallback(async () => {
    if (!isMounted.current) return;

    if (!isOnline) {
      // Offline but have cached data
      if (data) {
        setIsStale(true);
        if (showError) {
          // Only show once per fetch attempt
          const key = `offline-stale-${url}`;
          // Simple deduplication
          const now = Date.now();
          const lastShown = (global as any)[key] as number | undefined;
          if (!lastShown || now - lastShown > 5000) {
            (global as any)[key] = now;
            showError(t('offline.offline'), t('offline.offlineDataAvailable'));
          }
        }
      } else {
        // No cached data
        setError(new Error(t('offline.noCachedData')));
        if (showError) showError(t('offline.error'), t('offline.noCachedData'));
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher(url);
      if (!isMounted.current) return;

      // Cache the result
      await setCache(key, result, ttl);
      setData(result);
      setIsStale(false);
      setCachedAt(new Date());
      onSuccess?.(result);
    } catch (err) {
      if (!isMounted.current) return;

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      if (showError) showError(t('offline.error'), error.message);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [isOnline, url, key, ttl, fetcher, data, showError, t, onSuccess, onError]);

  // ── Auto-refetch on network change ──────────────────────────────────────────

  useEffect(() => {
    if (isOnline) {
      refetch();
    }
  }, [isOnline, refetch]);

  // ── Clear cache ────────────────────────────────────────────────────────────

  const clearCache = useCallback(async () => {
    try {
      await invalidateCache(key);
      setData(initialData);
      setIsStale(false);
      setCachedAt(null);
    } catch (err) {
      console.error(`[useOfflineData] Cache clear error for ${key}:`, err);
    }
  }, [key, initialData]);

  return {
    data,
    error,
    isLoading,
    isStale,
    cachedAt,
    refetch,
    clearCache,
  };
}
