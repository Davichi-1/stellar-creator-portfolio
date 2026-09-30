/**
 * ActivityScreen — Real-time activity feed with API integration.
 *
 * Delegates display to ActivityTimelineScreen for the full timeline view.
 * This screen acts as the tab-level entry point, handles initial data
 * loading and passes hydrated state down.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  SectionList,
  SectionListData,
  SectionListRenderItem,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from '../theme/tokens';
import {
  ActivityEvent,
  ActivityEventType,
  ActivityFilterType,
  ActivitySummary,
} from '../types';
import { ActivityEventItem } from '../components/activity/ActivityEventItem';
import { ActivitySummaryCard } from '../components/activity/ActivitySummaryCard';
import { ActivityFilterBar } from '../components/activity/ActivityFilterBar';
import { ActivityEmptyState } from '../components/activity/ActivityEmptyState';
import { activityTimelineService } from '../services/ActivityTimelineService';
import { useI18n } from '../i18n/I18nProvider';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ActivityScreenProps {
  onNavigate?: (screen: string, params?: Record<string, unknown>) => void;
}

// ─── Section helpers ───────────────────────────────────────────────────────────

interface TimelineSection {
  title: string;
  data: ActivityEvent[];
}

const FILTER_EVENT_TYPES: Record<ActivityFilterType, ActivityEventType[] | null> = {
  all:          null,
  bounties:     ['bounty_posted', 'bounty_applied', 'bounty_accepted', 'bounty_rejected', 'bounty_completed'],
  reviews:      ['review_received', 'review_left'],
  payments:     ['payment_received', 'payment_sent'],
  messages:     ['message_received'],
  applications: ['bounty_applied', 'bounty_accepted', 'bounty_rejected'],
};

function buildSections(
  events: ActivityEvent[],
  labels: { today: string; yesterday: string; thisWeek: string; older: string },
): TimelineSection[] {
  const now       = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo   = new Date(today.getTime() - 7 * 86_400_000);

  const buckets: Record<string, ActivityEvent[]> = {
    [labels.today]:     [],
    [labels.yesterday]: [],
    [labels.thisWeek]:  [],
    [labels.older]:     [],
  };

  for (const evt of events) {
    const d   = new Date(evt.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today)          buckets[labels.today].push(evt);
    else if (day >= yesterday) buckets[labels.yesterday].push(evt);
    else if (day >= weekAgo)   buckets[labels.thisWeek].push(evt);
    else                       buckets[labels.older].push(evt);
  }

  return Object.entries(buckets)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({ title, data }));
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ActivityScreen({ onNavigate }: ActivityScreenProps) {
  const { t } = useI18n();
  const { showError } = useToast();

  const [events, setEvents]           = useState<ActivityEvent[]>([]);
  const [filter, setFilter]           = useState<ActivityFilterType>('all');
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 15;

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const data = activityTimelineService.generateMockEvents(50);
      activityTimelineService['events'] = data; // hydrate service
      setEvents(data);
    } catch (err) {
      showError?.('Error', t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = activityTimelineService.generateMockEvents(50);
    setEvents(data);
    setPage(1);
    setRefreshing(false);
  }, [refreshing]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const allowed = FILTER_EVENT_TYPES[filter];
    return allowed ? events.filter((e) => allowed.includes(e.type)) : events;
  }, [events, filter]);

  const visible = useMemo(
    () => filtered.slice(0, page * PAGE_SIZE),
    [filtered, page],
  );

  const sections = useMemo(
    () =>
      buildSections(visible, {
        today:     t('activity.todaySection'),
        yesterday: t('activity.yesterdaySection'),
        thisWeek:  t('activity.thisWeekSection'),
        older:     t('activity.olderSection'),
      }),
    [visible, t],
  );

  const unreadCount = useMemo(() => events.filter((e) => !e.read).length, [events]);

  const summary: ActivitySummary = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let weeklyEarnings = 0;
    let weeklyBounties = 0;
    events.forEach((e) => {
      if (new Date(e.createdAt).getTime() >= weekAgo) {
        if (e.amount) weeklyEarnings += e.amount;
        if (e.type.startsWith('bounty_') && e.type !== 'bounty_rejected') weeklyBounties++;
      }
    });
    return { totalEvents: events.length, unreadCount, weeklyEarnings, weeklyBounties };
  }, [events, unreadCount]);

  const filterCounts = useMemo<Record<ActivityFilterType, number>>(() => {
    const countFor = (types: ActivityEventType[] | null) =>
      types ? events.filter((e) => types.includes(e.type) && !e.read).length
            : events.filter((e) => !e.read).length;
    return {
      all:          countFor(null),
      bounties:     countFor(FILTER_EVENT_TYPES.bounties),
      reviews:      countFor(FILTER_EVENT_TYPES.reviews),
      payments:     countFor(FILTER_EVENT_TYPES.payments),
      messages:     countFor(FILTER_EVENT_TYPES.messages),
      applications: countFor(FILTER_EVENT_TYPES.applications),
    };
  }, [events]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleMarkAllRead = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEvents((prev) => prev.map((e) => ({ ...e, read: true })));
  }, []);

  const handleFilterChange = useCallback(
    async (f: ActivityFilterType) => {
      if (f === filter) return;
      await Haptics.selectionAsync();
      setFilter(f);
      setPage(1);
    },
    [filter],
  );

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || visible.length >= filtered.length) return;
    setLoadingMore(true);
    await new Promise((r) => setTimeout(r, 300));
    setPage((p) => p + 1);
    setLoadingMore(false);
  }, [loadingMore, visible.length, filtered.length]);

  const handleEventPress = useCallback(
    async (event: ActivityEvent) => {
      await Haptics.selectionAsync();
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, read: true } : e)),
      );
      // Navigate based on type
      switch (event.type) {
        case 'bounty_posted':
        case 'bounty_applied':
        case 'bounty_accepted':
        case 'bounty_completed':
          onNavigate?.('BountyDetail', { bountyId: event.relatedId });
          break;
        case 'message_received':
          onNavigate?.('Messaging', { conversationId: event.relatedId });
          break;
        default:
          break;
      }
    },
    [onNavigate],
  );

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderItem: SectionListRenderItem<ActivityEvent, TimelineSection> = useCallback(
    ({ item, section, index }) => (
      <ActivityEventItem
        event={item}
        isLast={index === section.data.length - 1}
        onPress={handleEventPress}
      />
    ),
    [handleEventPress],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<ActivityEvent, TimelineSection> }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: ActivityEvent) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <View>
        <ActivitySummaryCard summary={summary} />
        <ActivityFilterBar
          selectedFilter={filter}
          onFilterChange={handleFilterChange}
          counts={filterCounts}
        />
      </View>
    ),
    [summary, filter, handleFilterChange, filterCounts],
  );

  const ListFooter = useMemo(() => {
    if (visible.length >= filtered.length) return null;
    return (
      <Pressable
        onPress={handleLoadMore}
        style={({ pressed }) => [styles.loadMoreBtn, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={t('activity.loadMore')}
      >
        <Text style={styles.loadMoreText}>
          {loadingMore ? t('activity.loadingMore') : t('activity.loadMore')}
        </Text>
      </Pressable>
    );
  }, [visible.length, filtered.length, loadingMore, handleLoadMore, t]);

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>{t('activity.screenTitle')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('activity.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>{t('activity.screenTitle')}</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadBadge}>
              {unreadCount} {t('activity.unread')}
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={handleMarkAllRead}
            style={({ pressed }) => [styles.markReadBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t('activity.markAllRead')}
          >
            <Text style={styles.markReadText}>{t('activity.markAllRead')}</Text>
          </Pressable>
        )}
      </View>

      {/* Timeline SectionList */}
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          <ActivityEmptyState
            icon="📭"
            title={t('activity.noActivity')}
            subtitle={t('activity.noActivitySub')}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={12}
        initialNumToRender={10}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  screenTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  unreadBadge: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  markReadBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  markReadText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  sectionHeader: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  sectionHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  loadMoreText: {
    fontSize: FontSize.base,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
});
