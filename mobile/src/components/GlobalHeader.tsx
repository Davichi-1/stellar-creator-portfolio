/**
 * GlobalHeader — the shared, platform-aware authenticated header for all
 * logged-in screens.
 *
 * Issue #1353 — "Create Native Authenticated Global Header component":
 * The header now supports two display modes:
 *
 *  • **Standard mode** (`showUserSection={false}`, the default):  renders a
 *    centred title with optional back button and trailing action slot — the
 *    same behaviour as before, so existing screens that already use
 *    `<GlobalHeader title="…" />` continue to work without changes.
 *
 *  • **Authenticated mode** (`showUserSection={true}`):  the leading slot
 *    shows the signed-in user's avatar (or initials fallback) and a greeting
 *    ("Good morning, Alex").  The trailing slot shows a notification bell with
 *    an optional unread-count badge.  User data is read directly from the
 *    Zustand `useAuthStore` so callers do not need to pass it down.
 *
 * Built entirely from React Native primitives — no third-party UI libraries.
 * Adapts its status-bar-aware top padding per platform, supports light/dark
 * mode, and every interactive element meets the 44 × 44 pt minimum touch
 * target (Apple HIG / 48 dp Android guideline).
 */
import React, {
  memo,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  Image,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { headerPalette, styles } from './GlobalHeader.styles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the hour-appropriate greeting prefix.
 * "Good morning" 05:00–11:59, "Good afternoon" 12:00–17:59, else "Good evening".
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Extracts up to two initials from a display name or email.
 * "Alice Smith" → "AS", "alice@example.com" → "A".
 */
function getInitials(displayName?: string, email?: string): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 1).toUpperCase();
  return '?';
}

// ─── Props ────────────────────────────────────────────────────────────────────

/** Props accepted by {@link GlobalHeader}. */
export interface GlobalHeaderProps {
  /** Title text rendered centered in the header. */
  title: string;
  /** Whether to render the leading back button. Defaults to `false`. */
  showBackButton?: boolean;
  /**
   * Custom back handler. When omitted, the back button falls back to
   * `router.back()` from `expo-router`.
   */
  onBackPress?: () => void;
  /** Optional node rendered in the trailing slot (e.g. an action icon). */
  rightAction?: ReactNode;
  /**
   * When `true`, replaces the centred title layout with an authenticated
   * user-section in the leading slot (avatar + greeting) and a notification
   * bell in the trailing slot.  The `title` prop is still required for
   * accessibility but is not rendered as visible text in this mode.
   *
   * Defaults to `false`.
   */
  showUserSection?: boolean;
  /**
   * Unread notification count shown on the notification badge.
   * A value of `0` or `undefined` hides the badge.
   */
  unreadCount?: number;
  /** Callback fired when the user taps the notification bell. */
  onNotificationsPress?: () => void;
  /** Callback fired when the user taps their own avatar. */
  onAvatarPress?: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AvatarProps {
  uri?: string;
  initials: string;
  backgroundColor: string;
}

/** Renders a 36 × 36 avatar circle — image when available, initials otherwise. */
const Avatar = memo(({ uri, initials, backgroundColor }: AvatarProps) => (
  <View style={[styles.avatarContainer, { backgroundColor }]}>
    {uri ? (
      <Image
        source={{ uri }}
        style={styles.avatarImage}
        accessibilityIgnoresInvertColors
      />
    ) : (
      <Text style={styles.avatarInitials}>{initials}</Text>
    )}
  </View>
));
Avatar.displayName = 'GlobalHeader.Avatar';

interface NotificationBadgeProps {
  count: number;
  badgeBackground: string;
  borderColor: string;
}

/** Red badge with a capped count ("9+" for counts > 9). */
const NotificationBadge = memo(
  ({ count, badgeBackground, borderColor }: NotificationBadgeProps) => {
    if (count <= 0) return null;
    return (
      <View
        style={[
          styles.notificationBadge,
          { backgroundColor: badgeBackground, borderColor },
        ]}
        accessibilityLabel={`${count} unread notification${count === 1 ? '' : 's'}`}
      >
        <Text style={styles.notificationBadgeText}>
          {count > 9 ? '9+' : String(count)}
        </Text>
      </View>
    );
  },
);
NotificationBadge.displayName = 'GlobalHeader.NotificationBadge';

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Authenticated global header. Memoized so it does not re-render when a parent
 * re-renders without changing its props.
 *
 * @param props - {@link GlobalHeaderProps}
 * @returns The rendered header element.
 */
function GlobalHeaderComponent({
  title,
  showBackButton = false,
  onBackPress,
  rightAction,
  showUserSection = false,
  unreadCount = 0,
  onNotificationsPress,
  onAvatarPress,
}: GlobalHeaderProps): React.JSX.Element {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const palette = headerPalette[colorScheme === 'dark' ? 'dark' : 'light'];

  // Auth store — read user data for authenticated mode
  const user = useAuthStore((s) => s.user);

  // Status-bar-aware top padding
  const topPadding = Platform.select({
    ios: insets.top,
    android: StatusBar.currentHeight ?? insets.top,
    default: insets.top,
  });

  const handleBackPress = useCallback(() => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    router.back();
  }, [onBackPress]);

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        backgroundColor: palette.background,
        borderBottomColor: palette.border,
        paddingTop: topPadding,
      },
    ],
    [palette.background, palette.border, topPadding],
  );

  const titleStyle = useMemo(
    () => [styles.title, { color: palette.title }],
    [palette.title],
  );

  const backLabelStyle = useMemo(
    () => [styles.backLabel, { color: palette.icon }],
    [palette.icon],
  );

  // Derived from auth state for the authenticated user section
  const initials = useMemo(
    () => getInitials(user?.displayName, user?.email),
    [user?.displayName, user?.email],
  );

  const firstName = useMemo(() => {
    if (!user) return undefined;
    if (user.displayName) return user.displayName.split(' ')[0];
    return user.email.split('@')[0];
  }, [user]);

  // ── Authenticated layout ─────────────────────────────────────────────────
  if (showUserSection) {
    return (
      <View
        style={containerStyle}
        accessibilityRole="header"
        accessibilityLabel={title}
      >
        <View style={styles.row}>
          {/* Leading: avatar + greeting */}
          <TouchableOpacity
            onPress={onAvatarPress}
            style={styles.userSection}
            accessibilityRole="button"
            accessibilityLabel={user ? `View profile for ${firstName}` : 'View profile'}
            activeOpacity={0.75}
          >
            <Avatar
              uri={user?.avatarUrl}
              initials={initials}
              backgroundColor={palette.avatarBackground}
            />
            {firstName ? (
              <View style={styles.greetingColumn}>
                <Text style={[styles.greetingLabel, { color: palette.greetingText }]}>
                  {getGreeting()}
                </Text>
                <Text style={[styles.greetingName, { color: palette.title }]}>
                  {firstName}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Trailing: right action override OR notification bell */}
          {rightAction != null ? (
            <View style={styles.sideRight}>{rightAction}</View>
          ) : (
            <TouchableOpacity
              onPress={onNotificationsPress}
              style={styles.notificationButton}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              activeOpacity={0.75}
            >
              <View style={styles.notificationBadgeWrapper}>
                {/* Bell icon — rendered as Unicode character, no extra dep */}
                <Text style={{ fontSize: 20, color: palette.icon }}>
                  {'🔔'}
                </Text>
                <NotificationBadge
                  count={unreadCount}
                  badgeBackground={palette.badgeBackground}
                  borderColor={palette.background}
                />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── Standard layout (back button + centred title + trailing action) ───────
  return (
    <View style={containerStyle}>
      <View style={styles.row}>
        <View style={styles.sideLeft}>
          {showBackButton ? (
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={backLabelStyle}>{'\u2039'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text
          style={titleStyle}
          numberOfLines={1}
          accessibilityRole="header"
          accessibilityLabel={title}
        >
          {title}
        </Text>

        <View style={styles.sideRight}>{rightAction}</View>
      </View>
    </View>
  );
}

/** Memoized {@link GlobalHeaderComponent}. */
export const GlobalHeader = memo(GlobalHeaderComponent);
GlobalHeader.displayName = 'GlobalHeader';
