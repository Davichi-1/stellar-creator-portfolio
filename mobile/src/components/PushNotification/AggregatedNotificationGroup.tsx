/**
 * AggregatedNotificationGroup - Grouped notifications display
 *
 * Features:
 *  - Collapsible notification groups
 *  - Haptic feedback on expand/collapse
 *  - Dark mode support
 *  - Accessible with proper roles and labels
 *  - Zero frame drops with optimized rendering
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { FontSize, FontWeight, Radius, Shadow, Spacing } from '../../theme/tokens';
import { AggregatedGroup } from '../../services/NotificationAggregator';
import { NotificationCard } from './NotificationCard';

interface AggregatedNotificationGroupProps {
  group: AggregatedGroup;
  onDismiss?: (groupId: string) => void;
  onNotificationPress?: (notificationId: string) => void;
  collapsed?: boolean;
}

export function AggregatedNotificationGroup({
  group,
  onDismiss,
  onNotificationPress,
  collapsed: initialCollapsed = false,
}: AggregatedNotificationGroupProps) {
  const { colors, isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const expandAnim = React.useRef(new Animated.Value(initialCollapsed ? 0 : 1)).current;

  const categoryColors = useMemo(() => {
    switch (group.category) {
      case 'message':
        return { bg: '#06b6d4', fg: '#ffffff' };
      case 'bounty':
        return { bg: '#6366f1', fg: '#ffffff' };
      case 'alert':
        return { bg: '#ef4444', fg: '#ffffff' };
      case 'promo':
        return { bg: '#f59e0b', fg: '#ffffff' };
      default:
        return { bg: colors.primary, fg: colors.textInverse };
    }
  }, [group.category, colors.primary, colors.textInverse]);

  const handleExpandToggle = useCallback(async () => {
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const toValue = isCollapsed ? 1 : 0;
    Animated.timing(expandAnim, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();

    setIsCollapsed(!isCollapsed);
  }, [isCollapsed, expandAnim]);

  const handleDismissGroup = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onDismiss) {
      onDismiss(group.groupKey);
    }
  }, [group.groupKey, onDismiss]);

  return (
    <View style={styles.group}>
      {/* Group Header */}
      <Pressable
        onPress={handleExpandToggle}
        style={({ pressed }) => [
          styles.groupHeader,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          pressed && styles.groupHeaderPressed,
          Shadow.sm,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Group: ${group.category}. ${group.notifications.length} notifications. ${isCollapsed ? 'Tap to expand' : 'Tap to collapse'}`}
      >
        <View
          style={[
            styles.categoryBadge,
            {
              backgroundColor: categoryColors.bg,
            },
          ]}
          accessible={false}
        >
          <Text
            style={[
              styles.categoryBadgeText,
              {
                color: categoryColors.fg,
              },
            ]}
          >
            {group.category === 'message' ? '💬' :
             group.category === 'bounty' ? '💰' :
             group.category === 'alert' ? '⚠️' :
             group.category === 'promo' ? '🎉' : '🔔'}
          </Text>
        </View>

        <View style={styles.groupInfo}>
          <Text
            style={[
              styles.groupTitle,
              {
                color: colors.text,
              },
            ]}
            accessibilityRole="header"
          >
            {group.category} • {group.notifications.length} {group.notifications.length === 1 ? 'message' : 'messages'}
          </Text>
          <Text
            style={[
              styles.groupSummary,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {group.summary}
          </Text>
        </View>

        <View style={styles.groupActions}>
          <Animated.View
            style={{
              transform: [{ rotate: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['180deg', '0deg'],
              }) }],
            }}
          >
            <Text style={[styles.expandIcon, { color: colors.textTertiary }]}>
              ▼
            </Text>
          </Animated.View>

          {onDismiss && (
            <Pressable
              onPress={handleDismissGroup}
              style={styles.dismissButton}
              accessibilityRole="button"
              accessibilityLabel="Dismiss group"
            >
              <Text style={[styles.dismissIcon, { color: colors.error }]}>✕</Text>
            </Pressable>
          )}
        </View>
      </Pressable>

      {/* Expanded Content */}
      <Animated.View
        style={{
          maxHeight: expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, group.notifications.length * 120],
          }),
          overflow: 'hidden',
        }}
      >
        <View style={styles.groupContent}>
          {group.notifications.map((notification, index) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onDismiss={index === 0 ? handleDismissGroup : undefined}
              onPress={() => {
                if (onNotificationPress) {
                  onNotificationPress(notification.id);
                }
              }}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: Spacing.base,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  groupHeaderPressed: {
    opacity: 0.9,
  },
  categoryBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  categoryBadgeText: {
    fontSize: 18,
  },
  groupInfo: {
    flex: 1,
  },
  groupTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  groupSummary: {
    fontSize: FontSize.sm,
    lineHeight: FontSize.base,
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  dismissButton: {
    padding: 4,
  },
  dismissIcon: {
    fontSize: 14,
  },
  groupContent: {
    paddingLeft: Spacing.md * 2,
    marginBottom: Spacing.xs,
  },
});
