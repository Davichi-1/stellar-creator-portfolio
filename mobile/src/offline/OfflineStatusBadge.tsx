/**
 * OfflineStatusBadge
 *
 * Compact inline status badge for showing offline state.
 * Perfect for headers, nav bars, and inline indicators.
 *
 * Features:
 *  - Three status variants: online, offline, syncing
 *  - Optional icon display
 *  - Configurable size
 *  - Accessible labels
 */

import React, { useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from '../theme/tokens';
import { useNetwork } from './NetworkProvider';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OfflineStatusBadgeProps {
  /**
   * Status override (use instead of network context)
   */
  status?: 'online' | 'offline' | 'syncing';
  /**
   * Show icon indicator
   */
  showIcon?: boolean;
  /**
   * Show text label
   */
  showLabel?: boolean;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Inline (compact) layout
   */
  inline?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function OfflineStatusBadge({ status: externalStatus, showIcon = true, showLabel = true, size = 'md', inline = false }: OfflineStatusBadgeProps) {
  const network = useNetwork();
  const status = externalStatus || (!network.isOnline ? 'offline' : network.syncStatus === 'syncing' ? 'syncing' : 'online');

  // ── Styles by size ──────────────────────────────────────────────────────────

  const sizes = {
    sm: {
      paddingVertical: 4,
      paddingHorizontal: Spacing.xs,
      fontSize: FontSize.xs,
      dotSize: 6,
    },
    md: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      fontSize: FontSize.xs,
      dotSize: 8,
    },
    lg: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      fontSize: FontSize.sm,
      dotSize: 10,
    },
  };

  const currentSize = sizes[size];

  // ── Colors by status ───────────────────────────────────────────────────────

  const colors = {
    online: {
      bg: Colors.successLight,
      text: Colors.success,
      dot: Colors.success,
    },
    offline: {
      bg: Colors.errorLight,
      text: Colors.error,
      dot: Colors.error,
    },
    syncing: {
      bg: Colors.warningLight,
      text: Colors.warning,
      dot: Colors.warning,
    },
  };

  const colorsForStatus = colors[status];

  // ── Label text ─────────────────────────────────────────────────────────────

  const labels = {
    online: 'Online',
    offline: 'Offline',
    syncing: 'Syncing',
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[
      styles.container,
      { backgroundColor: colorsForStatus.bg },
      inline && styles.containerInline,
      size === 'sm' && styles.containerSm,
      size === 'lg' && styles.containerLg,
    ]}>
      {/* Icon */}
      {showIcon && (
        <View style={[
          styles.statusDot,
          { width: currentSize.dotSize, height: currentSize.dotSize, backgroundColor: colorsForStatus.dot },
        ]} />
      )}

      {/* Label */}
      {showLabel && (
        <Text style={[
          styles.statusText,
          { color: colorsForStatus.text, fontSize: currentSize.fontSize },
        ]}>
          {labels[status]}
        </Text>
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
    borderRadius: Radius.full,
  },
  containerInline: {
    paddingHorizontal: Spacing.xs,
  },
  containerSm: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.xs,
  },
  containerLg: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  statusDot: {
    borderRadius: Radius.full,
  },
  statusText: {
    fontWeight: FontWeight.semibold,
    textTransform: 'capitalize',
  },
});
