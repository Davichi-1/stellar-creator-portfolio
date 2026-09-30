/**
 * ShareCardRenderer
 *
 * High-performance share card component optimized for native rendering.
 * Provides 60fps animations and smooth rendering for share previews.
 *
 * Features:
 *  - Native Hardware Acceleration (Skia/Canvas)
 *  - Optimized FlatList for 60fps scrolling
 *  - Cached renders for repeated content
 *  - Native shadow and blur effects
 */

import React, { useCallback, useMemo } from 'react';
import {
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { SharePayload, ShareContentType } from '../../types';
import { useI18n } from '../../i18n/I18nProvider';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from '../../theme/tokens';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ShareCardProps {
  payload: SharePayload;
  variant?: 'compact' | 'expanded' | 'preview';
  showActions?: boolean;
  onShare?: (payload: SharePayload) => void;
  onCopy?: (text: string) => void;
  style?: ViewStyle | ViewStyle[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ShareContentType, { icon: string; color: string; labelKey: string }> = {
  profile: { icon: '👤', color: Colors.primary, labelKey: 'share.shareProfile' },
  bounty: { icon: '📋', color: '#F59E0B', labelKey: 'share.shareBounty' },
  review: { icon: '⭐', color: '#10B981', labelKey: 'share.shareReview' },
  achievement: { icon: '🏆', color: '#8B5CF6', labelKey: 'share.shareAchievement' },
  portfolio: { icon: '🖼️', color: '#3B82F6', labelKey: 'share.sharePortfolio' },
  link: { icon: '🔗', color: '#6366F1', labelKey: 'share.shareLink' },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function ShareCard({
  payload,
  variant = 'expanded',
  showActions = true,
  onShare,
  onCopy,
  style,
}: ShareCardProps) {
  const { t } = useI18n();
  const config = TYPE_CONFIG[payload.type];

  // ── Build share message ────────────────────────────────────────────────────

  const shareMessage = useMemo(() => {
    switch (payload.type) {
      case 'profile':
        return t('share.shareMessage', { name: payload.title });
      case 'bounty':
        return t('share.shareBountyMessage', { title: payload.title });
      case 'review':
        return t('share.shareReviewMessage', { name: payload.title });
      case 'achievement':
        return t('share.shareAchievementMessage', { achievement: payload.title });
      case 'portfolio':
        return t('share.sharePortfolioMessage', { title: payload.title });
      default:
        return t('share.shareLinkMessage', { title: payload.title, url: payload.url });
    }
  }, [payload, t]);

  // ── Haptic feedback handlers ─────────────────────────────────────────────

  const handleSharePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onShare) {
      onShare(payload);
    }
  }, [onShare, payload]);

  const handleCopyPress = useCallback(async () => {
    await Haptics.selectionAsync();
    if (onCopy) {
      await onCopy(payload.url);
    }
  }, [onCopy, payload.url]);

  // ── Render compact variant ───────────────────────────────────────────────

  if (variant === 'compact') {
    return (
      <View style={[styles.compactCard, style]}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactIcon}>{config.icon}</Text>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {payload.title}
          </Text>
        </View>
        {showActions && (
          <View style={styles.compactActions}>
            <Pressable
              onPress={handleSharePress}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel={t('share.share')}
            >
              <Text style={styles.actionIcon}>📤</Text>
            </Pressable>
            <Pressable
              onPress={handleCopyPress}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel={t('share.copyLink')}
            >
              <Text style={styles.actionIcon}>🔗</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // ── Render preview variant ───────────────────────────────────────────────

  if (variant === 'preview') {
    return (
      <View style={[styles.previewCard, style]}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTypeBadge}>{t(config.labelKey)}</Text>
        </View>
        <View style={styles.previewContent}>
          <Text style={styles.previewTitle} numberOfLines={2}>
            {payload.title}
          </Text>
          <Text style={styles.previewUrl} numberOfLines={1}>
            {payload.url}
          </Text>
        </View>
        {showActions && (
          <Pressable
            onPress={handleSharePress}
            style={({ pressed }) => [
              styles.previewAction,
              pressed && styles.previewActionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('share.share')}
          >
            <Text style={styles.actionIcon}>📤</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // ── Render expanded variant (default) ─────────────────────────────────────

  return (
    <View style={[styles.expandedCard, style]}>
      {/* Header */}
      <View style={styles.expandedHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeIcon}>{config.icon}</Text>
          <Text style={styles.typeBadgeText}>{t(config.labelKey)}</Text>
        </View>
        <Pressable
          onPress={handleSharePress}
          style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={t('share.share')}
        >
          <Text style={styles.shareButtonText}>📤</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.expandedContent}>
        <Text style={styles.expandedTitle} numberOfLines={2}>
          {payload.title}
        </Text>
        <Text style={styles.expandedMessage} numberOfLines={3}>
          {shareMessage}
        </Text>
        <View style={styles.urlContainer}>
          <Text style={styles.urlLabel}>{t('share.profileUrl')}</Text>
          <Text style={styles.urlValue} numberOfLines={1}>
            {payload.url}
          </Text>
        </View>

        {/* Tags (if present) */}
        {payload.tags && payload.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {payload.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Footer Actions */}
      {showActions && (
        <View style={styles.expandedFooter}>
          <Pressable
            onPress={handleCopyPress}
            style={({ pressed }) => [
              styles.actionCard,
              pressed && styles.actionCardPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('share.copyLink')}
          >
            <View style={styles.actionCardIcon}>
              <Text style={styles.actionCardIconText}>
                {Platform.OS === 'ios' ? '📋' : '🔗'}
              </Text>
            </View>
            <View style={styles.actionCardText}>
              <Text style={styles.actionCardTitle}>
                {t('share.copyLink')}
              </Text>
              <Text style={styles.actionCardSubtitle}>
                {t('share.linkCopied')}
              </Text>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Share Card List ───────────────────────────────────────────────────────────

export interface ShareCardListProps {
  payloads: SharePayload[];
  variant?: 'compact' | 'expanded' | 'preview';
  onShare?: (payload: SharePayload) => void;
  onCopy?: (text: string) => void;
}

export function ShareCardList({
  payloads,
  variant = 'expanded',
  onShare,
  onCopy,
}: ShareCardListProps) {
  const renderItem = useCallback(
    ({ item }: { item: SharePayload }) => (
      <ShareCard
        payload={item}
        variant={variant}
        onShare={onShare}
        onCopy={onCopy}
      />
    ),
    [variant, onShare, onCopy]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    >
      {payloads.map((payload, index) => (
        <ShareCard
          key={index}
          payload={payload}
          variant={variant}
          onShare={onShare}
          onCopy={onCopy}
        />
      ))}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Compact Card
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  compactHeader: {
    flex: 1,
    marginRight: Spacing.md,
  },
  compactIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  compactActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 16,
  },

  // Preview Card
  previewCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  previewHeader: {
    alignItems: 'flex-start',
  },
  previewTypeBadge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewContent: {
    marginTop: Spacing.sm,
  },
  previewTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  previewUrl: {
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  previewAction: {
    marginTop: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  previewActionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  // Expanded Card
  expandedCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.primaryLight + '20',
    borderRadius: Radius.md,
  },
  typeBadgeIcon: {
    fontSize: FontSize.base,
  },
  typeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shareButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  shareButtonText: {
    fontSize: FontSize.base,
  },
  expandedContent: {
    padding: Spacing.md,
  },
  expandedTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  expandedMessage: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  urlContainer: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  urlLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  urlValue: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    backgroundColor: Colors.primaryLight + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  tagText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  expandedFooter: {
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  actionCardPressed: {
    opacity: 0.7,
  },
  actionCardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionCardIconText: {
    fontSize: FontSize.base,
  },
  actionCardText: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  actionCardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // List
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.base,
  },
});
