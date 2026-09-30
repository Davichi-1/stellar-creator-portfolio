/**
 * CacheableView
 *
 * Higher-order component that automatically caches rendered content.
 * Shows cached state with visual indicator when data is stale.
 *
 * Features:
 *  - Auto-caching on first render
 *  - Stale state indicator
 *  - Manual refresh capability
 *  - Configurable TTL
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { cacheGet, cacheSet, cacheInvalidate, CacheResult } from '../services/CachingService';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from '../theme/tokens';
import { useI18n } from '../i18n/I18nProvider';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CacheableViewProps<T> {
  /**
   * Cache key for storing/retrieving data
   */
  cacheKey: string;
  /**
   * TTL in milliseconds (default: 5 minutes)
   */
  ttlMs?: number;
  /**
   * Function to fetch fresh data
   */
  fetcher: () => Promise<T>;
  /**
   * Function to render cached/fresh data
   */
  renderContent: (data: T, isStale: boolean) => React.ReactNode;
  /**
   * Function to render loading state
   */
  renderLoading?: () => React.ReactNode;
  /**
   * Function to render error state
   */
  renderError?: (error: Error) => React.ReactNode;
  /**
   * Force refresh flag
   */
  forceRefresh?: boolean;
  /**
   * Callback when data is refreshed
   */
  onRefresh?: (data: T, fromCache: boolean) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function CacheableView<T>({
  cacheKey,
  ttlMs = 5 * 60 * 1000,
  fetcher,
  renderContent,
  renderLoading,
  renderError,
  forceRefresh = false,
  onRefresh,
}: CacheableViewProps<T>) {
  const { t } = useI18n();
  const [data, setData] = useState<T | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ── Load from cache on mount ────────────────────────────────────────────────

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try cache first
        if (!forceRefresh) {
          const cached = await cacheGet<T>(cacheKey);
          if (cached && !cached.isStale) {
            setData(cached.data);
            setIsStale(false);
            setIsLoading(false);
            onRefresh?.(cached.data, true);
            return;
          }
        }

        // Fetch fresh data
        const fresh = await fetcher();
        setData(fresh);
        setIsStale(false);
        await cacheSet(cacheKey, fresh, ttlMs);
        setIsLoading(false);
        onRefresh?.(fresh, false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsLoading(false);
        console.error(`[CacheableView] Error loading ${cacheKey}:`, error);
      }
    };

    loadData();
  }, [cacheKey, forceRefresh, ttlMs, fetcher, onRefresh]);

  // ── Handle refresh ──────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    await Haptics.selectionAsync();
    setIsLoading(true);
    setError(null);

    try {
      const fresh = await fetcher();
      setData(fresh);
      setIsStale(false);
      await cacheSet(cacheKey, fresh, ttlMs);
      setIsLoading(false);
      onRefresh?.(fresh, false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
      console.error(`[CacheableView] Error refreshing ${cacheKey}:`, error);
    }
  }, [cacheKey, ttlMs, fetcher, onRefresh]);

  // ── Clear cache ────────────────────────────────────────────────────────────

  const handleClearCache = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await cacheInvalidate(cacheKey);
    setIsLoading(true);
    setError(null);

    try {
      const fresh = await fetcher();
      setData(fresh);
      setIsStale(false);
      await cacheSet(cacheKey, fresh, ttlMs);
      setIsLoading(false);
      onRefresh?.(fresh, false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
    }
  }, [cacheKey, ttlMs, fetcher, onRefresh]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (error && !data) {
    return renderError ? renderError(error) : (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
        <Pressable onPress={handleRefresh} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading && !data) {
    return renderLoading ? renderLoading() : (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.container}>
      {/* Stale indicator */}
      {isStale && (
        <View style={styles.staleBadge}>
          <Text style={styles.staleText}>{t('offline.syncing')}</Text>
        </View>
      )}

      {/* Content */}
      {renderContent(data, isStale)}

      {/* Refresh indicator */}
      {isStale && (
        <Pressable
          onPress={handleRefresh}
          style={styles.refreshTrigger}
          accessibilityRole="button"
          accessibilityLabel={t('offline.retry')}
        >
          <Text style={styles.refreshText}>↻ {t('offline.retry')}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  staleBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.warningLight,
  },
  staleText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
  },
  refreshTrigger: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  refreshText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  loadingText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.base,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  retryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textInverse,
  },
});
