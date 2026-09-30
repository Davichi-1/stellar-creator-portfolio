/**
 * CacheMetricsManager
 *
 * Tracks cache performance metrics for analytics and optimization.
 * Monitors hit rates, eviction rates, and stale hits.
 *
 * Features:
 *  - Hit/miss tracking per cache key
 *  - Eviction tracking
 *  - Stale hit detection
 *  - Cache size monitoring
 *  - Performance report generation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const METRICS_PREFIX = '@tamgora/cache_metrics/';
const STATS_KEY = '@tamgora/cache_stats';
const LRU_KEY = '@tamgora/cache_lru';

interface CacheHit {
  key: string;
  timestamp: number;
  hit: boolean;
  stale: boolean;
}

interface CacheStats {
  totalRequests: number;
  hits: number;
  misses: number;
  staleHits: number;
  evictions: number;
  lastAccess: number;
}

// ─── Core Operations ───────────────────────────────────────────────────────────

export async function recordHit(key: string, hit: boolean, stale = false): Promise<void> {
  const stats = await getStats();
  stats.totalRequests++;
  if (hit) stats.hits++;
  if (!hit) stats.misses++;
  if (stale && hit) stats.staleHits++;
  stats.lastAccess = Date.now();

  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
    await recordLRU(key);
  } catch (error) {
    console.error('[CacheMetricsManager] Error recording hit:', error);
  }
}

export async function recordLRU(key: string): Promise<void> {
  try {
    const now = Date.now();
    const raw = await AsyncStorage.getItem(LRU_KEY);
    const lru: Record<string, number> = raw ? JSON.parse(raw) : {};
    lru[key] = now;
    // Keep only last 100 entries
    const sorted = Object.entries(lru).sort((a, b) => b[1] - a[1]).slice(0, 100);
    await AsyncStorage.setItem(LRU_KEY, JSON.stringify(Object.fromEntries(sorted)));
  } catch (error) {
    console.error('[CacheMetricsManager] Error recording LRU:', error);
  }
}

export async function getStats(): Promise<CacheStats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw) as CacheStats;
    return {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      staleHits: 0,
      evictions: 0,
      lastAccess: 0,
    };
  } catch (error) {
    console.error('[CacheMetricsManager] Error getting stats:', error);
    return { totalRequests: 0, hits: 0, misses: 0, staleHits: 0, evictions: 0, lastAccess: 0 };
  }
}

export async function getLRU(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(LRU_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('[CacheMetricsManager] Error getting LRU:', error);
    return {};
  }
}

export async function clearMetrics(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATS_KEY);
    await AsyncStorage.removeItem(LRU_KEY);
  } catch (error) {
    console.error('[CacheMetricsManager] Error clearing metrics:', error);
  }
}

export async function getPerformanceReport(): Promise<{
  hitRate: number;
  staleHitRate: number;
  totalSize: number;
  entries: number;
}> {
  const stats = await getStats();
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((k) => k.startsWith(METRICS_PREFIX));
  
  let totalSize = 0;
  for (const key of cacheKeys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) totalSize += raw.length;
    } catch {
      // Ignore
    }
  }

  const hitRate = stats.totalRequests > 0 ? (stats.hits / stats.totalRequests) * 100 : 0;
  const staleHitRate = stats.hits > 0 ? (stats.staleHits / stats.hits) * 100 : 0;

  return {
    hitRate,
    staleHitRate,
    totalSize,
    entries: cacheKeys.length,
  };
}

// ─── Cache Invalidation with Metrics ───────────────────────────────────────────

export async function invalidateWithMetrics(key: string): Promise<void> {
  await recordEviction(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('[CacheMetricsManager] Error invalidating:', error);
  }
}

async function recordEviction(key: string): Promise<void> {
  const stats = await getStats();
  stats.evictions++;
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('[CacheMetricsManager] Error recording eviction:', error);
  }
}
