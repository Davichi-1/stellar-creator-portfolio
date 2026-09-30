/**
 * ActivityTimelineScreen
 *
 * Issue 3 — "Construct explicit comprehensive global Activity timeline
 * summaries internally"
 *
 * Features:
 *  - Weekly summary card (total events, earnings, bounties, unread)
 *  - Chronological timeline with section headers (Today / Yesterday / This Week / Earlier)
 *  - Filter tabs: All / Bounties / Reviews / Payments / Messages / Applications
 *  - Mark-all-read action
 *  - Infinite scroll with load-more
 *  - SectionList for zero frame drops (native section rendering)
 *  - Full i18n + haptics + accessibility
 *  - Pull-to-refresh for latest updates
 *  - Optimized rendering with VirtualizedList props
 */

import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  SectionList,
  SectionListData,
  SectionListRenderItem,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ActivityEventItem } from '../components/activity/ActivityEventItem';
import { ActivitySummaryCard } from '../components/activity/ActivitySummaryCard';
import { ActivityEmptyState } from '../components/activity/ActivityEmptyState';
import { ActivityFilterBar } from '../components/activity/ActivityFilterBar';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from '../theme/tokens';
import {
  ActivityEvent,
  ActivityEventType,
  ActivityFilterType,
  ActivitySummary,
} from '../types';
import { useI18n } from '../i18n/I18nProvider';

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const EVENT_TYPES: ActivityEventType[] = [
  'bounty_posted', 'bounty_applied', 'bounty_accepted', 'bounty_rejected', 'bounty_completed',
  'review_received', 'review_left', 'payment_received', 'payment_sent',
  'message_received', 'profile_viewed', 'match_found', 'dispute_opened', 'dispute_resolved',
];

const MOCK_NAMES = [
  'Alice Chen', 'Bob Martinez', 'Sarah Johnson', 'David Kim', 'Emma Wilson',
];

function buildMockEvents(): ActivityEvent[] {
  return Array.from({ length: 50 }, (_, i) => ({
    id: `evt-${i}`,
    type: EVENT_TYPES[i % EVENT_TYPES.length],
    title: EVENT_TYPES[i % EVENT_TYPES.length].replace(/_/g, ' '),
    subtitle: i % 4 === 0 ? 'Logo design for Tamgora platform' : undefined,
    amount: [4, 7, 11].includes(i % 12) ? 250 + i * 10 : undefined,
    relatedId: `item-${i}`,
    relatedName: [MOCK_NAMES[i % MOCK_NAMES.length], 'Stellar Bounty #42', undefined, 'Project Alpha'][i % 4] ?? undefined,
    avatarUrl: undefined,
    read: i > 15,
    createdAt: new Date(Date.now() - i * 3_600_000 * 6).toISOString(),
  }));
}

const INITIAL_EVENTS = buildMockEvents();

// ─── Filter Mapping ────────────────────────────────────────────────────────────

const FILTER_EVENT_TYPES: Record<ActivityFilterType, ActivityEventType[] | null> = {
  all:          null,
  bounties:     ['bounty_posted', 'bounty_applied', 'bounty_accepted', 'bounty_rejected', 'bounty_completed'],
  reviews:      ['review_received', 'review_left'],
  payments:     ['payment_received', 'payment_sent'],
  messages:     ['message_received'],
  applications: ['bounty_applied', 'bounty_accepted', 'bounty_rejected'],
};

// ─── Section Grouping ──────────────────────────────────────────────────────────

interface TimelineSection {
  title: string;
  data: ActivityEvent[];
}

function groupIntoSections(
  events: ActivityEvent[],
  labels: { today: string; yesterday: string; thisWeek: string; older: string },
): TimelineSection[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

export function ActivityTimelineScreen() {
  const { t } = useI18n();

  const [events, setEvents]             = useState<ActivityEvent[]>(INITIAL_EVENTS);
  const [filter, setFilter]             = useState<ActivityFilterType>('all');
  const [page, setPage]                 = useState(1);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const PAGE_SIZE = 15;

  // ── Derived data ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const allowed = FILTER_EVENT_TYPES[filter];
    return allowed ? events.filter((e) => allowed.includes(e.type)) : events;
  }, [events, filter]);

  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  const sections = useMemo(
    () =>
      groupIntoSections(visible, {
        today:     t('activity.todaySection'),
        yesterday: t('activity.yesterdaySection'),
        thisWeek:  t('activity.thisWeekSection'),
        older:     t('activity.olderSection'),
      }),
    [visible, t],
  );

  const unreadCount = useMemo(() => events.filter((e) => !e.read).length, [events]);

  const summary: ActivitySummary = useMemo(() => {
    const now     = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
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

  // per-tab unread counts for the filter bar badges
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
    await new Promise((r) => setTimeout(r, 400));
    setPage((p) => p + 1);
    setLoadingMore(false);
  }, [loadingMore, visible.length, filtered.length]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [refreshing]);

  const handleEventPress = useCallback(async (event: ActivityEvent) => {
    await Haptics.selectionAsync();
    // Mark as read
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, read: true } : e)));
    Alert.alert(event.type.replace(/_/g, ' '), event.relatedName ?? event.id);
  }, []);

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

  // ── Sub-components ─────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Screen header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>{t('activity.timelineTitle')}</Text>
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
});
