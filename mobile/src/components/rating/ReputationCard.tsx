/**
 * ReputationCard — Issue #802
 * "Construct explicit highly robust native specific User rating structures internally"
 *
 * Features:
 *  - User reputation display card
 *  - Multiple score metrics
 *  - Trend indicators
 *  - Badges system
 *  - Interactive score details
 *  - Zero frame drops
 *  - Accessibility support
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { FontSize, FontWeight, Radius, Spacing } from '../../theme/tokens';
import i18n from '../../i18n';
import { StarRating } from './StarRating';
import type { UserReputation, RatingTrend } from '../../types/rating';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReputationCardProps {
  reputation: UserReputation;
  showDetails?: boolean;
  onDetailsPress?: () => void;
  compact?: boolean;
}

export interface ScoreMetricProps {
  label: string;
  value: number;
  color: string;
  trend?: RatingTrend;
}

// ─── Component: ScoreMetric ──────────────────────────────────────────────────

function ScoreMetric({ label, value, color, trend }: ScoreMetricProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.metricContainer}>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <View style={styles.metricValueContainer}>
        <Text style={[styles.metricValue, { color: colors.text }]}>
          {value.toFixed(0)}
        </Text>
        <View style={styles.trendContainer}>
          {trend && (
            <Text style={[styles.trend, { color: getTrendColor(trend) }]}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '−'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function getTrendColor(trend: RatingTrend): string {
  switch (trend) {
    case 'up':
      return '#10b981'; // emerald
    case 'down':
      return '#ef4444'; // red
    case 'flat':
      return '#9ca3af'; // gray
    default:
      return '#9ca3af';
  }
}

// ─── Component: ReputationBadge ──────────────────────────────────────────────

function ReputationBadge({ badge }: { badge: string }) {
  const { colors } = useTheme();

  const badgeColors: Record<string, string> = {
    'top-creator': '#6366f1',
    'verified': '#10b981',
    'premium': '#d946ef',
    'expert': '#f59e0b',
  };

  const badgeIcons: Record<string, string> = {
    'top-creator': '⭐',
    'verified': '✓',
    'premium': '💎',
    'expert': '🎓',
  };

  const badgeColor = badgeColors[badge] || '#6366f1';
  const badgeIcon = badgeIcons[badge] || '★';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColor + '20',
          borderColor: badgeColor,
        },
      ]}
    >
      <Text style={[styles.badgeIcon, { color: badgeColor }]}>
        {badgeIcon}
      </Text>
      <Text
        style={[
          styles.badgeText,
          { color: badgeColor },
        ]}
      >
        {i18n.t(`rating.badge.${badge}`) || badge}
      </Text>
    </View>
  );
}

// ─── Component: ReputationCard ───────────────────────────────────────────────

export function ReputationCard({
  reputation,
  showDetails = true,
  onDetailsPress,
  compact = false,
}: ReputationCardProps) {
  const { colors, isDark } = useTheme();

  const averageScore = useMemo(() => {
    const scores = [
      reputation.ratingScore,
      reputation.qualityScore,
      reputation.reliabilityScore,
      reputation.communicationScore,
    ];
    const sum = scores.reduce((acc, score) => acc + score, 0);
    return sum / scores.length;
  }, [reputation]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        compact && { paddingVertical: Spacing.sm },
      ]}
    >
      {/* Header */}
      <View style={compact ? styles.compactHeader : styles.header}>
        {/* Avatar */}
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              { color: colors.textSecondary },
            ]}
          >
            {reputation.avatarUrl
              ? reputation.avatarUrl.charAt(0).toUpperCase()
              : reputation.username.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.username, { color: colors.text }]}>
            {reputation.username}
          </Text>
          <View style={styles.ratingContainer}>
            <StarRating rating={reputation.ratingScore} size="sm" />
            <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
              {reputation.ratingScore.toFixed(1)}
            </Text>
            <Text style={[styles.ratingCount, { color: colors.textTertiary }]}>
              ({reputation.totalRatingsReceived})
            </Text>
          </View>
        </View>
      </View>

      {/* Main Scores */}
      <View style={compact ? styles.compactScores : styles.scores}>
        <View style={styles.scoreMain}>
          <Text style={[styles.mainScoreLabel, { color: colors.textSecondary }]}>
            {i18n.t('rating.reputation')}
          </Text>
          <View style={styles.mainScoreValueContainer}>
            <Text
              style={[
                styles.mainScoreValue,
                { color: colors.primary },
              ]}
            >
              {reputation.overallScore}
            </Text>
            <Text
              style={[
                styles.mainScoreMax,
                { color: colors.textTertiary },
              ]}
            >
              /100
            </Text>
          </View>
          <View style={styles.trendContainer}>
            {reputation.trend && (
              <Text
                style={[
                  styles.trend,
                  { color: getTrendColor(reputation.trend) },
                ]}
              >
                {reputation.trend === 'up' ? '↑' : reputation.trend === 'down' ? '↓' : '−'}
              </Text>
            )}
          </View>
        </View>

        {/* Individual Scores */}
        <View style={styles.scoreGrid}>
          <ScoreMetric
            label={i18n.t('rating.quality')}
            value={reputation.qualityScore}
            color={colors.primary}
            trend={reputation.trend}
          />
          <ScoreMetric
            label={i18n.t('rating.reliability')}
            value={reputation.reliabilityScore}
            color={colors.primary}
            trend={reputation.trend}
          />
          <ScoreMetric
            label={i18n.t('rating.communication')}
            value={reputation.communicationScore}
            color={colors.primary}
            trend={reputation.trend}
          />
        </View>
      </View>

      {/* Response & Completion Rates */}
      {!compact && (
        <View style={styles.ratesContainer}>
          <View style={styles.rateItem}>
            <Text
              style={[
                styles.rateLabel,
                { color: colors.textSecondary },
              ]}
            >
              {i18n.t('rating.responseRate')}
            </Text>
            <Text
              style={[styles.rateValue, { color: colors.primary }]}
            >
              {reputation.responseRate.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.rateItem}>
            <Text
              style={[
                styles.rateLabel,
                { color: colors.textSecondary },
              ]}
            >
              {i18n.t('rating.completionRate')}
            </Text>
            <Text
              style={[styles.rateValue, { color: colors.primary }]}
            >
              {reputation.completionRate.toFixed(0)}%
            </Text>
          </View>
        </View>
      )}

      {/* Badges */}
      {!compact && reputation.badges.length > 0 && (
        <View style={styles.badgesContainer}>
          <Text
            style={[
              styles.badgesLabel,
              { color: colors.textSecondary },
            ]}
          >
            {i18n.t('rating.badges')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {reputation.badges.map((badge) => (
              <ReputationBadge key={badge} badge={badge} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Details Button */}
      {showDetails && onDetailsPress && !compact && (
        <Pressable
          style={styles.detailsButton}
          onPress={onDetailsPress}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('rating.viewDetails')}
        >
          <Text
            style={[
              styles.detailsText,
              { color: colors.primary },
            ]}
          >
            {i18n.t('rating.viewDetails')} →
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: FontWeight.semibold,
  },
  infoContainer: {
    flex: 1,
  },
  username: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  ratingText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  ratingCount: {
    fontSize: FontSize.xs,
  },
  scores: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  compactScores: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  scoreMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mainScoreLabel: {
    fontSize: FontSize.sm,
  },
  mainScoreValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  mainScoreValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  mainScoreMax: {
    fontSize: FontSize.sm,
  },
  scoreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  metricContainer: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: FontSize.xs,
    marginBottom: 4,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  trendContainer: {
    marginLeft: 2,
  },
  trend: {
    fontSize: 10,
  },
  ratesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  rateItem: {
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: FontSize.xs,
  },
  rateValue: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  badgesContainer: {
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  badgesLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  badgesScroll: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeIcon: {
    fontSize: 10,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  detailsButton: {
    alignItems: 'center',
    paddingVertical: Spacing.base,
  },
  detailsText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
});

export default ReputationCard;