/**
 * ActivityEmptyState
 *
 * Clean, accessible empty state for activity timeline.
 * Provides helpful guidance to users when no activity exists.
 */

import React, { useCallback } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useI18n } from '../i18n/I18nProvider';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from '../theme/tokens';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityEmptyStateProps {
  icon?: string;
  title?: string;
  subtitle?: string;
  onAction?: () => void;
  actionLabel?: string;
  variant?: 'default' | 'home' | 'empty';
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ActivityEmptyState({
  icon = '📭',
  title,
  subtitle,
  onAction,
  actionLabel,
  variant = 'default',
}: ActivityEmptyStateProps) {
  const { t } = useI18n();

  const defaultTitle = t('activity.noActivity');
  const defaultSubtitle = t('activity.noActivitySub');

  const handleAction = useCallback(async () => {
    if (onAction) {
      await Haptics.selectionAsync();
      onAction();
    }
  }, [onAction]);

  return (
    <View style={[styles.container, variant === 'home' && styles.homeContainer]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <Text style={styles.title}>{title || defaultTitle}</Text>

      <Text style={styles.subtitle}>{subtitle || defaultSubtitle}</Text>

      {onAction && (
        <Pressable
          onPress={handleAction}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel || t('common.retry')}
        >
          <Text style={styles.actionButtonText}>
            {actionLabel || t('common.retry')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  homeContainer: {
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 32,
    opacity: 0.5,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  actionButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textInverse,
  },
});
