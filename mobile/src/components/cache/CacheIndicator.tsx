/**
 * CacheIndicator
 *
 * Visual indicator showing cache status for the current view.
 * Displays hit status, staleness, and last updated time.
 *
 * Features:
 *  - Cache hit/miss indicator
 *  - Staleness warning
 *  - Last updated timestamp
 *  - Cache size display
 */

import React, { useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { cacheGetStats, CacheStats } from '../services/CachingService';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from '../theme/tokens';
import { useI18n } from '../i18n/I18nProvider';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CacheIndicatorProps {
  /**
   * Show cache stats
   */
  showStats?: boolean;
  /**
   * Show staleness warning
   */
  showStaleness?: boolean;
  /**
   * Compact display
   */
  compact?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function CacheIndicator({ showStats = true, showStaleness = true, compact = false }: CacheIndicatorProps) {
  const { t } = useI18n();
  const [stats, setStats] = useState<CacheStats>({ hits: 0, misses: 0, totalRequests: 0, totalSize: 0, entries: 0 });

  useEffect(() => {
    cacheGetStats().then(setStats);
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  const hitRate = stats.totalRequests > 0 ? (stats.hits / stats.totalRequests) * 100 : 0;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactText}>{stats.entries} {t('common.entries')}</Text>
        <Text style={styles.compactText}>{formatSize(stats.totalSize)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cache hit rate */}
      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{hitRate.toFixed(0)}%</Text>
          <Text style={styles.statLabel}>{t('offline.hitRate')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.entries}</Text>
          <Text style={styles.statLabel}>{t('common.entries')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatSize(stats.totalSize)}</Text>
          <Text style={styles.statLabel}>{t('offline.cacheSize')}</Text>
        </View>
      </View>

      {/* Staleness warning */}
      {showStaleness && (
        <View style={styles.stalenessContainer}>
          <Text style={styles.stalenessText}>
            {t('offline.staleness')} {stats.staleHits > 0 ? `${stats.staleHits} stale hits` : t('offline.staleNone')}
          </Text>
        </View>
      )}

      {/* Last updated */}
      <View style={styles.lastUpdated}>
        <Text style={styles.lastUpdatedText}>
          {t('offline.lastUpdated')} {new Date(stats.lastAccess).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  compactText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  stalenessContainer: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.warningLight,
  },
  stalenessText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
    textAlign: 'center',
  },
  lastUpdated: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  lastUpdatedText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
