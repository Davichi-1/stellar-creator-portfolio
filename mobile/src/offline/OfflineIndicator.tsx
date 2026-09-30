/**
 * OfflineIndicator
 *
 * Minimal network status indicator badge.
 * Shows current connectivity status with animated indicators.
 *
 * Features:
 *  - Online/Offline status with smooth transitions
 *  - Network type indicator (WiFi, Cellular)
 *  - Sync status badge when syncing
 *  - Compact design for inline placement
 */

import React, { useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNetwork } from './NetworkProvider';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from '../theme/tokens';
import { useI18n } from '../i18n/I18nProvider';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OfflineIndicatorProps {
  /**
   * Show network type label
   */
  showType?: boolean;
  /**
   * Show sync status
   */
  showSync?: boolean;
  /**
   * Inline display mode (compact)
   */
  inline?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function OfflineIndicator({ showType = true, showSync = true, inline = false }: OfflineIndicatorProps) {
  const { t } = useI18n();
  const network = useNetwork();

  const statusColor = useMemo(() => {
    if (!network.isOnline) return Colors.error;
    if (network.syncStatus === 'syncing') return Colors.warning;
    return Colors.success;
  }, [network.isOnline, network.syncStatus]);

  const statusLabel = useMemo(() => {
    if (!network.isOnline) return t('offline.offline');
    if (network.syncStatus === 'syncing') return t('offline.syncing');
    return t('offline.online');
  }, [network.isOnline, network.syncStatus, t]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, inline && styles.containerInline]}>
      {/* Status dot */}
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />

      {/* Status label */}
      <Text style={[styles.statusText, { color: statusColor }]}>
        {statusLabel}
      </Text>

      {/* Network type */}
      {showType && network.networkType && network.isOnline && (
        <Text style={styles.networkType}>
          {network.networkType}
        </Text>
      )}

      {/* Sync badge */}
      {showSync && network.syncStatus === 'syncing' && (
        <View style={styles.syncBadge}>
          <Text style={styles.syncText}>
            {t('offline.syncing')}…
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
  },
  containerInline: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'capitalize',
  },
  networkType: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginLeft: Spacing.xs,
  },
  syncBadge: {
    marginLeft: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.warningLight,
  },
  syncText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
  },
});
