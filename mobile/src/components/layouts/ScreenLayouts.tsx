/**
 * Tamgora — standard UI layout primitives for Expo Router screens.
 *
 * Provides composable layout wrappers used across every authenticated and
 * unauthenticated screen so spacing, safe-area handling, and scroll behaviour
 * are consistent without repeating boilerplate in each screen file.
 *
 * Exported components:
 *  - ScreenLayout       — full-screen safe-area wrapper with optional scroll
 *  - SectionHeader      — standardised section title + optional subtitle row
 *  - ContentCard        — elevated card surface for grouped content
 *  - EmptyScreenState   — centred empty-state with icon, title, and CTA
 *  - LoadingScreen      — full-screen spinner shown during data fetches
 *  - KeyboardScreen     — ScreenLayout that auto-avoids the keyboard
 *
 * Related: #1351
 */

import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { FontSize, FontWeight, Radius, Spacing } from "../../src/theme/tokens";

// ---------------------------------------------------------------------------
// ScreenLayout
// ---------------------------------------------------------------------------

export interface ScreenLayoutProps {
  children: React.ReactNode;
  /** Apply horizontal + vertical padding from the design token scale. */
  padded?: boolean;
  /** Wrap content in a ScrollView (default: false). */
  scrollable?: boolean;
  /** Additional style applied to the outer SafeAreaView. */
  style?: StyleProp<ViewStyle>;
  /** Additional style applied to the inner content container. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Background colour override (defaults to theme.colors.background). */
  backgroundColor?: string;
  testID?: string;
}

/**
 * Full-screen safe-area wrapper.  Every authenticated screen should use this
 * as its root element so insets, background colour, and padding are applied
 * consistently from a single source of truth.
 */
export function ScreenLayout({
  children,
  padded = true,
  scrollable = false,
  style,
  contentStyle,
  backgroundColor,
  testID,
}: ScreenLayoutProps): React.JSX.Element {
  const { colors } = useTheme();
  const bg = backgroundColor ?? colors.background;

  const inner = (
    <View
      style={[
        styles.inner,
        padded && styles.padded,
        { backgroundColor: bg },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: bg }, style]}
      testID={testID}
    >
      {scrollable ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, padded && styles.padded]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// KeyboardScreen
// ---------------------------------------------------------------------------

export interface KeyboardScreenProps extends ScreenLayoutProps {
  /** KeyboardAvoidingView offset — add extra padding above keyboard if needed. */
  keyboardOffset?: number;
}

/**
 * ScreenLayout that wraps content in a KeyboardAvoidingView so form fields
 * are never obscured by the software keyboard.
 */
export function KeyboardScreen({
  children,
  keyboardOffset = 0,
  ...rest
}: KeyboardScreenProps): React.JSX.Element {
  return (
    <ScreenLayout {...rest} scrollable={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardOffset}
      >
        {children}
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard section header used to label grouped content within a screen.
 * Optionally renders a right-aligned action (e.g. "See all" link).
 */
export function SectionHeader({
  title,
  subtitle,
  rightAction,
  style,
}: SectionHeaderProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionHeaderText}>
        <Text
          style={[styles.sectionTitle, { color: colors.text }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAction ? <View>{rightAction}</View> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ContentCard
// ---------------------------------------------------------------------------

export interface ContentCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
  testID?: string;
}

/**
 * Elevated card surface.  Use to visually group related content on a screen.
 * Supports an optional onPress handler for tappable cards.
 */
export function ContentCard({
  children,
  style,
  padded = true,
  onPress,
  testID,
}: ContentCardProps): React.JSX.Element {
  const { colors } = useTheme();

  const card = (
    <View
      style={[
        styles.card,
        padded && styles.cardPadded,
        { backgroundColor: colors.card, shadowColor: colors.text },
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityRole="button"
      >
        {card}
      </TouchableOpacity>
    );
  }

  return card;
}

// ---------------------------------------------------------------------------
// EmptyScreenState
// ---------------------------------------------------------------------------

export interface EmptyScreenStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  /** Label for the primary CTA button. */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Centred empty-state layout rendered when a screen has no data to show.
 * Accepts an optional icon node, descriptive text, and a single CTA.
 */
export function EmptyScreenState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
  testID,
}: EmptyScreenStateProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.emptyRoot, style]}
      testID={testID}
      accessibilityLiveRegion="polite"
    >
      {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.emptyAction, { backgroundColor: colors.primary }]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.emptyActionLabel, { color: colors.primaryForeground ?? "#fff" }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// LoadingScreen
// ---------------------------------------------------------------------------

export interface LoadingScreenProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Full-screen spinner shown while data is loading.  Drop-in replacement for
 * an empty ScreenLayout during async operations.
 */
export function LoadingScreen({ message, style }: LoadingScreenProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.loadingRoot, { backgroundColor: colors.background }, style]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={message ?? "Loading"}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? (
        <Text style={[styles.loadingMessage, { color: colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
  },
  scrollContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing[3],
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing[1],
  },
  card: {
    borderRadius: Radius.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPadded: {
    padding: Spacing[4],
  },
  emptyRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[8],
  },
  emptyIcon: {
    marginBottom: Spacing[4],
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
    marginBottom: Spacing[2],
  },
  emptyMessage: {
    fontSize: FontSize.base,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing[6],
  },
  emptyAction: {
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: Radius.full,
  },
  emptyActionLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[3],
  },
  loadingMessage: {
    fontSize: FontSize.sm,
  },
});
