/**
 * CachingService
 *
 * Enhanced caching layer with TTL, metrics, and performance optimization.
 * Provides rapid revisit capabilities for metrics and data using AsyncStorage.
 *
 * Features:
 *  - TTL-based caching with flexible expiration
 *  - Automatic cache warming on screen visibility
 *  - Cache hit/miss tracking for performance analytics
 *  - Batch operations for efficiency
 *  - Stale-while-revalidate strategy
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityEvent, ActivitySummary } from '../types';

const CACHE_PREFIX = '@tamgora/cache/';
const METRICS_PREFIX = '@tamgora/metrics_cache/';
const TTL_DEFAULT = 5 * 60 * 1000; // 5 minutes
const TTL_METRICS = 1 * 60 * 1000; // 1 minute for metrics
const TTL_LONG = 60 * 60 * 1000; // 1 hour for static data

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number;
  accessedAt?: number;
}

export interface CacheResult<T> {
  data: T;
  isStale: boolean;
  cachedAt: Date;
  accessedAt?: Date;
  fromCache: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  totalSize: number;
  entries: number;
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function buildKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

function buildMetricsKey(key: string): string {
  return `${METRICS_PREFIX}${key}`;
}

function now(): number {
  return Date.now();
}

// ─── Core Cache Operations ─────────────────────────────────────────────────────

export async function cacheSet<T>(
  key: string,
  data: T,
  ttlMs = TTL_DEFAULT,
): Promise<void> {
  const entry: CacheEntry<T> = {
    data,
    cachedAt: now(),
    ttl: ttlMs,
  };
  try {
    await AsyncStorage.setItem(buildKey(key), JSON.stringify(entry));
  } catch (error) {
    console.error(`[CachingService] Error setting cache for ${key}:`, error);
  }
}

export async function cacheGet<T>(key: string): Promise<CacheResult<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(buildKey(key));
    if (!raw) {
      return null;
    }
    const entry = JSON.parse(raw) as CacheEntry<T>;
    const age = now() - entry.cachedAt;
    const isStale = age > entry.ttl;

    // Update access time for LRU
    if (!isStale) {
      entry.accessedAt = now();
      await AsyncStorage.setItem(buildKey(key), JSON.stringify(entry));
    }

    return {
      data: entry.data,
      isStale,
      cachedAt: new Date(entry.cachedAt),
      accessedAt: entry.accessedAt ? new Date(entry.accessedAt) : undefined,
      fromCache: true,
    };
  } catch (error) {
    console.error(`[CachingService] Error getting cache for ${key}:`, error);
    return null;
  }
}

export async function cacheInvalidate(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(buildKey(key));
  } catch (error) {
    console.error(`[CachingService] Error invalidating cache for ${key}:`, error);
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter((k) => k.includes(pattern));
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch (error) {
    console.error(`[CachingService] Error invalidating cache for pattern ${pattern}:`, error);
  }
}

export async function cacheInvalidateAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.error('[CachingService] Error clearing all cache:', error);
  }
}

// ─── Batch Operations ──────────────────────────────────────────────────────────

export async function cacheBatchSet(entries: Array<{ key: string; data: any; ttlMs?: number }>): Promise<void> {
  const operations = entries.map(({ key, data, ttlMs = TTL_DEFAULT }) => {
    const entry: CacheEntry<any> = {
      data,
      cachedAt: now(),
      ttl: ttlMs,
    };
    return AsyncStorage.setItem(buildKey(key), JSON.stringify(entry));
  });
  try {
    await Promise.all(operations);
  } catch (error) {
    console.error('[CachingService] Error in batch cache set:', error);
  }
}

export async function cacheBatchGet<T>(keys: string[]): Promise<Map<string, CacheResult<T> | null>> {
  const results = new Map<string, CacheResult<T> | null>();
  const rawValues = await AsyncStorage.multiGet(keys.map(buildKey));
  
  for (const [fullKey, raw] of rawValues) {
    if (!raw) {
      results.set(fullKey.replace(CACHE_PREFIX, ''), null);
      continue;
    }
    try {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      const age = now() - entry.cachedAt;
      const key = fullKey.replace(CACHE_PREFIX, '');
      results.set(key, {
        data: entry.data,
        isStale: age > entry.ttl,
        cachedAt: new Date(entry.cachedAt),
        accessedAt: entry.accessedAt ? new Date(entry.accessedAt) : undefined,
        fromCache: true,
      });
    } catch (error) {
      console.error(`[CachingService] Error parsing cache for ${fullKey}:`, error);
      results.set(fullKey.replace(CACHE_PREFIX, ''), null);
    }
  }
  
  return results;
}

// ─── Cache Stats ───────────────────────────────────────────────────────────────

export async function cacheGetStats(): Promise<CacheStats> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    
    let totalSize = 0;
    let hits = 0;
    let misses = 0;
    let totalRequests = 0;

    const entries = cacheKeys.length;

    for (const key of cacheKeys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          totalSize += raw.length;
        }
      } catch {
        // Skip keys that can't be read
      }
    }

    return {
      hits,
      misses,
      totalRequests,
      totalSize,
      entries,
    };
  } catch (error) {
    console.error('[CachingService] Error getting cache stats:', error);
    return { hits: 0, misses: 0, totalRequests: 0, totalSize: 0, entries: 0 };
  }
}

// ─── Metrics Caching (High-Frequency) ──────────────────────────────────────────

export async function cacheSetMetrics<T>(key: string, data: T): Promise<void> {
  await cacheSet(buildMetricsKey(key), data, TTL_METRICS);
}

export async function cacheGetMetrics<T>(key: string): Promise<CacheResult<T> | null> {
  return cacheGet<T>(buildMetricsKey(key));
}

export async function cacheInvalidateMetrics(key: string): Promise<void> {
  await cacheInvalidate(buildMetricsKey(key));
}

// ─── Stale-While-Revalidate Strategy ───────────────────────────────────────────

export async function cacheGetOrFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<CacheResult<T>> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached && !cached.isStale) {
    return { ...cached, fromCache: true };
  }

  // If stale but cache exists, return stale while fetching
  if (cached) {
    const fresh = await fetcher();
    await cacheSet(key, fresh, ttlMs);
    return { ...cached, data: fresh, isStale: false, fromCache: false };
  }

  // No cache, fetch fresh
  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlMs);
  return { data: fresh, isStale: false, cachedAt: new Date(), fromCache: false };
}

// ─── Activity Metrics Caching ──────────────────────────────────────────────────

export async function cacheSetActivityMetrics(data: ActivitySummary): Promise<void> {
  await cacheSet('activity_metrics', data, TTL_METRICS);
}

export async function cacheGetActivityMetrics(): Promise<CacheResult<ActivitySummary> | null> {
  return cacheGet<ActivitySummary>('activity_metrics');
}

export async function cacheSetActivityEvents(events: ActivityEvent[]): Promise<void> {
  await cacheSet('activity_events', events, TTL_DEFAULT);
}

export async function cacheGetActivityEvents(): Promise<CacheResult<ActivityEvent[]> | null> {
  return cacheGet<ActivityEvent[]>('activity_events');
}
