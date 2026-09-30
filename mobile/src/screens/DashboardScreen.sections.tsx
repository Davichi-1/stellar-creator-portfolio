import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MetricCard } from '../components/dashboard/MetricCard';
import { BarChart } from '../components/dashboard/BarChart';
import { SkillsChart } from '../components/dashboard/SkillsChart';
import { useTheme } from '../theme/ThemeProvider';
import { DashboardData, MetricCard as MetricCardType } from '../types';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../theme/tokens';
import { ACTIVITY_ICON } from './DashboardScreen.data';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

/**
 * The five memoized dashboard body sections (metrics grid, earnings chart,
 * bounties chart, top skills, recent activity), split out of
 * `DashboardScreen` to keep that file focused on layout/data-fetching.
 * Returns `null` for every section while `data` hasn't loaded yet.
 */
export function useDashboardSections(data: DashboardData | undefined, colors: ThemeColors) {
  const MetricsSection = useMemo(() => {
    if (!data) return null;
    const pairs: [MetricCardType, MetricCardType][] = [
      [data.metrics[0], data.metrics[1]],
      [data.metrics[2], data.metrics[3]],
    ];
    return (
      <View style={styles.metricsGrid}>
        {pairs.map((pair, i) => (
          <View key={i} style={styles.metricsRow}>
            <MetricCard metric={pair[0]} style={styles.metricCell} />
            <MetricCard metric={pair[1]} style={styles.metricCell} />
          </View>
        ))}
      </View>
    );
  }, [data]);

  const EarningsSection = useMemo(() => {
    if (!data) return null;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Earnings</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textTertiary }]}>
          Current vs previous period
        </Text>
        <BarChart
          data={data.earningsChart}
          height={140}
          barColor={colors.primary}
          secondaryColor={colors.primaryLight}
          style={styles.chart}
          accessibilityLabel="Earnings bar chart"
        />
      </View>
    );
  }, [data, colors]);

  const BountiesSection = useMemo(() => {
    if (!data) return null;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Bounties Completed</Text>
        <BarChart
          data={data.bountiesChart}
          height={120}
          barColor={colors.accent}
          style={styles.chart}
          showValues
          accessibilityLabel="Bounties bar chart"
        />
      </View>
    );
  }, [data, colors]);

  const SkillsSection = useMemo(() => {
    if (!data) return null;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Top Skills</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textTertiary }]}>
          By completed bounties
        </Text>
        <View style={styles.chartPad}>
          <SkillsChart skills={data.topSkills} />
        </View>
      </View>
    );
  }, [data, colors]);

  const ActivitySection = useMemo(() => {
    if (!data) return null;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Activity</Text>
        {data.recentActivity.map((item, i) => (
          <View
            key={item.id}
            style={[
              styles.activityRow,
              i < data.recentActivity.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={styles.activityIcon}>{ACTIVITY_ICON[item.type] ?? '📌'}</Text>
            <View style={styles.activityText}>
              <Text style={[styles.activityLabel, { color: colors.text }]} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={[styles.activityTime, { color: colors.textTertiary }]}>
                {item.time}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  }, [data, colors]);

  return { MetricsSection, EarningsSection, BountiesSection, SkillsSection, ActivitySection };
}

const styles = StyleSheet.create({
  metricsGrid: { gap: Spacing.sm },
  metricsRow: { flexDirection: 'row', gap: Spacing.sm },
  metricCell: { flex: 1 },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.sm,
  },
  chart: { marginTop: Spacing.sm },
  chartPad: { marginTop: Spacing.sm },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  activityIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  activityText: { flex: 1 },
  activityLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  activityTime: { fontSize: FontSize.xs, marginTop: 1 },
});
