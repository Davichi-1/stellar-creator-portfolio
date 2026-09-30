/**
 * CacheInvalidation
 *
 * Cache invalidation utilities for clearing stale data.
 * Supports pattern-based, key-based, and time-based invalidation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@tamgora/cache/';
const METRICS_PREFIX = '@tamgora/metrics_cache/';

// ─── Key-based Invalidation ────────────────────────────────────────────────────

export async function invalidateCacheKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    await AsyncStorage.removeItem(`${METRICS_PREFIX}${key}`);
  } catch (error) {
    console.error(`[CacheInvalidation] Error invalidating key ${key}:`, error);
  }
}

export async function invalidateCacheKeys(keys: string[]): Promise<void> {
  try {
    const fullKeys = keys.map(k => `${CACHE_PREFIX}${k}`);
    const metricsKeys = keys.map(k => `${METRICS_PREFIX}${k}`);
    await AsyncStorage.multiRemove([...fullKeys, ...metricsKeys]);
  } catch (error) {
    console.error('[CacheInvalidation] Error invalidating multiple keys:', error);
  }
}

// ─── Pattern-based Invalidation ────────────────────────────────────────────────

export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.includes(pattern));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.error(`[CacheInvalidation] Error invalidating pattern ${pattern}:`, error);
  }
}

// ─── Time-based Invalidation ───────────────────────────────────────────────────

export async function invalidateStaleCache(maxAgeMs: number): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));

    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const key of cacheKeys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const entry = JSON.parse(raw) as { cachedAt: number; ttl: number };
          if (now - entry.cachedAt > entry.ttl) {
            keysToRemove.push(key);
          }
        }
      } catch {
        // Skip keys that can't be read
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch (error) {
    console.error('[CacheInvalidation] Error invalidating stale cache:', error);
  }
}

// ─── Category-based Invalidation ───────────────────────────────────────────────

export async function invalidateCategory(category: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pattern = `${CACHE_PREFIX}${category}`;
    const cacheKeys = keys.filter((k) => k.startsWith(pattern));

    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.error(`[CacheInvalidation] Error invalidating category ${category}:`, error);
  }
}

export async function invalidateAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX) || k.startsWith(METRICS_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.error('[CacheInvalidation] Error clearing all cache:', error);
  }
}
