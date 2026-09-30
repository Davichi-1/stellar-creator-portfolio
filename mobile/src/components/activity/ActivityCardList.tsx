/**
 * ActivityCardList
 *
 * High-performance activity timeline with optimized rendering.
 * Uses SectionList for 60fps native scrolling with zero frame drops.
 *
 * Features:
 *  - Native SectionList for optimized section rendering
 *  - Virtualized rendering with window size control
 *  - Infinite scroll with pagination
 *  - Haptic feedback on interactions
 *  - Sticky section headers
 */

import React, {
  useCallback,
  useMemo,
} from 'react';
import {
  ActivityIndicator,
  SectionList,
  SectionListData,
  SectionListRenderItem,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ActivityEvent } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { ActivityEventItem } from './ActivityEventItem';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from '../theme/tokens';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityCardListProps {
  events: ActivityEvent[];
  loading?: boolean;
  loadingMore?: boolean;
  onEndReached?: () => void;
  onEventPress?: (event: ActivityEvent) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
}

export interface TimelineSection {
  title: string;
  data: ActivityEvent[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SECTION_LABELS = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This Week',
  older: 'Earlier',
};

// ─── Helper Functions ──────────────────────────────────────────────────────────

function groupIntoSections(events: ActivityEvent[]): TimelineSection[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const buckets: Record<string, ActivityEvent[]> = {
    [SECTION_LABELS.today]: [],
    [SECTION_LABELS.yesterday]: [],
    [SECTION_LABELS.thisWeek]: [],
    [SECTION_LABELS.older]: [],
  };

  for (const evt of events) {
    const d = new Date(evt.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) {
      buckets[SECTION_LABELS.today].push(evt);
    } else if (day >= yesterday) {
      buckets[SECTION_LABELS.yesterday].push(evt);
    } else if (day >= weekAgo) {
      buckets[SECTION_LABELS.thisWeek].push(evt);
    } else {
      buckets[SECTION_LABELS.older].push(evt);
    }
  }

  return Object.entries(buckets)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({ title, data }));
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ActivityCardList({
  events,
  loading = false,
  loadingMore = false,
  onEndReached,
  onEventPress,
  emptyTitle,
  emptySubtitle,
}: ActivityCardListProps) {
  const { t } = useI18n();
  const sections = useMemo(() => groupIntoSections(events), [events]);

  const handleItemPress = useCallback(
    async (event: ActivityEvent) => {
      await Haptics.selectionAsync();
      onEventPress?.(event);
    },
    [onEventPress]
  );

  const handleLoadMore = useCallback(() => {
    if (loadingMore) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onEndReached?.();
  }, [loadingMore, onEndReached]);

  // Render section header with optimized performance
  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<ActivityEvent, TimelineSection> }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    ),
    []
  );

  // Render item with memoization
  const renderItem = useCallback<
    SectionListRenderItem<ActivityEvent, TimelineSection>
  >(
    ({ item, section, index }) => {
      const isLast = index === section.data.length - 1;
      return (
        <ActivityEventItem
          event={item}
          isLast={isLast}
          onPress={handleItemPress}
        />
      );
    },
    [handleItemPress]
  );

  const keyExtractor = useCallback((item: ActivityEvent) => item.id, []);

  // Loading state
  if (loading && events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>
          {emptyTitle || t('activity.loading')}
        </Text>
      </View>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyTitle}>
          {emptyTitle || t('activity.noActivity')}
        </Text>
        <Text style={styles.emptySubtitle}>
          {emptySubtitle || t('activity.noActivitySub')}
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={true}
      removeClippedSubviews={true}
      maxToRenderPerBatch={8}
      windowSize={12}
      initialNumToRender={10}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : null
      }
    />
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  sectionHeader: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.sm,
  },
  sectionHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingMoreContainer: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
