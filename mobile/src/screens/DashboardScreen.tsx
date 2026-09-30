/**
 * DashboardScreen — Issue 4
 * "Develop exact distinct native specific Dashboard analytics mappings accurately"
 *
 * Features:
 *  - 4 KPI metric cards (earnings, bounties, views, rating) with animated count-up
 *  - Earnings bar chart (7d / 30d / 90d / all periods)
 *  - Bounties bar chart with secondary comparison bars
 *  - Top skills horizontal bar chart
 *  - Recent activity feed
 *  - Period selector tabs
 *  - Offline-first via useOfflineData (cached data shown instantly)
 *  - Stale data indicator
 *  - Pull-to-refresh
 *  - Full dark mode via useTheme()
 *  - Zero frame drops: ScrollView + memoized sections
 *
 * The mock data fetcher lives in `DashboardScreen.data.ts` and the memoized
 * body sections (metrics grid, charts, activity feed) live in
 * `DashboardScreen.sections.tsx` — kept separate so this file only handles
 * screen layout and data-fetching state.
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useOfflineData } from '../hooks/useOfflineData';
import { AnalyticsPeriod, DashboardData } from '../types';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../theme/tokens';
import { fetchDashboard, PERIODS } from './DashboardScreen.data';
import { useDashboardSections } from './DashboardScreen.sections';

export function DashboardScreen({ navigation }: { navigation?: any }) {
  const { colors, isDark } = useTheme();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const fetcher = useCallback(() => fetchDashboard(period), [period]);

  const { data, isLoading, isStale, cachedAt, refetch } = useOfflineData<DashboardData>(
    `dashboard-${period}`,
    fetcher,
    { ttlMs: 5 * 60 * 1000 },
  );

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePeriodChange = useCallback((p: AnalyticsPeriod) => {
    setPeriod(p);
  }, []);

  const { MetricsSection, EarningsSection, BountiesSection, SkillsSection, ActivitySection } =
    useDashboardSections(data, colors);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
          {isStale && cachedAt && (
            <Text style={[styles.staleNote, { color: colors.warning }]}>
              ⚠️ Showing cached data from {cachedAt.toLocaleTimeString()}
            </Text>
          )}
        </View>
        {isLoading && !refreshing && (
          <ActivityIndicator color={colors.primary} size="small" />
        )}
      </View>

      {/* Period selector */}
      <View style={[styles.periodBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => handlePeriodChange(p.key)}
            style={[
              styles.periodTab,
              period === p.key && { backgroundColor: colors.primary, borderRadius: Radius.md },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: period === p.key }}
            accessibilityLabel={`${p.label} period`}
          >
            <Text
              style={[
                styles.periodLabel,
                { color: period === p.key ? '#fff' : colors.textSecondary },
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isLoading && !data ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading analytics…
            </Text>
          </View>
        ) : (
          <>
            {MetricsSection}
            {EarningsSection}
            {BountiesSection}
            {SkillsSection}
            {ActivitySection}
            <Pressable
              onPress={() => navigation?.navigate('FocusTimer')}
              style={[styles.focusModeCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}
              accessibilityRole="button"
              accessibilityLabel="Open Focus Mode"
            >
              <Text style={[styles.focusModeTitle, { color: colors.text }]}>🍅 Focus Mode</Text>
              <Text style={[styles.focusModeSubtitle, { color: colors.textSecondary }]}>
                Start a Pomodoro session
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold },
  staleNote: { fontSize: FontSize.xs, marginTop: 2 },
  periodBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  periodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  periodLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.md,
  },
  loadingCenter: {
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
    gap: Spacing.md,
  },
  loadingText: { fontSize: FontSize.base },
  focusModeCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  focusModeTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  focusModeSubtitle: {
    fontSize: FontSize.sm,
  },
});
