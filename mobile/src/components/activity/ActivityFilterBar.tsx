/**
 * ActivityFilterBar
 *
 * Horizontal filter tabs for activity timeline filtering.
 * Optimized for touch interactions with haptic feedback.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ActivityFilterType } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from '../theme/tokens';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityFilterBarProps {
  selectedFilter: ActivityFilterType;
  onFilterChange: (filter: ActivityFilterType) => void;
  showAll?: boolean;
  hideCounts?: boolean;
  counts?: Record<ActivityFilterType, number>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const FILTERS: { key: ActivityFilterType; label: string; icon?: string }[] = [
  { key: 'all', label: 'All', icon: '📊' },
  { key: 'bounties', label: 'Bounties', icon: '📋' },
  { key: 'reviews', label: 'Reviews', icon: '⭐' },
  { key: 'payments', label: 'Payments', icon: '💰' },
  { key: 'messages', label: 'Messages', icon: '💬' },
  { key: 'applications', label: 'Applications', icon: '📨' },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function ActivityFilterBar({
  selectedFilter,
  onFilterChange,
  showAll = true,
  hideCounts = false,
  counts = {},
}: ActivityFilterBarProps) {
  const { t } = useI18n();

  const filteredFilters = useMemo(
    () => (showAll ? FILTERS : FILTERS.filter(f => f.key !== 'all')),
    [showAll]
  );

  const handleFilterChange = useCallback(
    async (filter: ActivityFilterType) => {
      if (filter === selectedFilter) return;
      await Haptics.selectionAsync();
      onFilterChange(filter);
    },
    [selectedFilter, onFilterChange]
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {filteredFilters.map((filter) => {
        const isSelected = selectedFilter === filter.key;
        const count = hideCounts ? undefined : counts[filter.key];

        return (
          <Pressable
            key={filter.key}
            onPress={() => handleFilterChange(filter.key)}
            style={({ pressed }) => [
              styles.tab,
              isSelected && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={filter.label}
            accessibilityHint={
              isSelected ? 'Selected' : `Filter by ${filter.label}`
            }
          >
            <View style={styles.tabContent}>
              <Text style={styles.icon}>{filter.icon}</Text>
              <Text style={[styles.label, isSelected && styles.labelActive]}>
                {filter.label}
              </Text>
              {count !== undefined && count > 0 && (
                <View style={[styles.countBadge, isSelected && styles.countBadgeActive]}>
                  <Text style={[styles.count, isSelected && styles.countActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  contentContainer: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  tabPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  icon: {
    fontSize: FontSize.base,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  labelActive: {
    color: Colors.textInverse,
    fontWeight: FontWeight.semibold,
  },
  countBadge: {
    marginLeft: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: Colors.border,
  },
  countBadgeActive: {
    backgroundColor: Colors.primaryLight,
  },
  count: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
  },
  countActive: {
    color: Colors.text,
  },
});
