/**
 * Static StyleSheet definitions and theme palettes for {@link GlobalHeader}.
 *
 * Keeping every style here (rather than inline in the component) avoids
 * recreating style objects on each render and keeps the component body lean.
 *
 * Issue #1353 — "Create Native Authenticated Global Header component":
 * Added avatar slot styles, user-greeting area, and notification badge.
 */
import { StyleSheet } from 'react-native';
import {
  DarkColors,
  FontSize,
  FontWeight,
  LightColors,
  Radius,
  Spacing,
} from '../theme/tokens';

/** Fixed height of the header content row (excludes the status-bar inset). */
export const HEADER_CONTENT_HEIGHT = 56;

/** Width reserved for the leading / trailing action slots so the title stays centered. */
const SIDE_SLOT_MIN_WIDTH = 48;

/** Resolved color palette for a single color scheme. */
export interface HeaderPalette {
  background: string;
  border: string;
  title: string;
  icon: string;
  avatarBackground: string;
  avatarText: string;
  badgeBackground: string;
  badgeText: string;
  greetingText: string;
}

/**
 * Semantic header colors per color scheme, derived from the shared design
 * tokens so the header stays in sync with the rest of the app.
 */
export const headerPalette: Record<'light' | 'dark', HeaderPalette> = {
  light: {
    background: LightColors.surface,
    border: LightColors.border,
    title: LightColors.text,
    icon: LightColors.text,
    avatarBackground: '#6366f1',
    avatarText: '#ffffff',
    badgeBackground: '#ef4444',
    badgeText: '#ffffff',
    greetingText: LightColors.textSecondary,
  },
  dark: {
    background: DarkColors.surface,
    border: DarkColors.border,
    title: DarkColors.text,
    icon: DarkColors.text,
    avatarBackground: '#4f46e5',
    avatarText: '#ffffff',
    badgeBackground: '#ef4444',
    badgeText: '#ffffff',
    greetingText: DarkColors.textSecondary,
  },
};

export const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    height: HEADER_CONTENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  sideLeft: {
    minWidth: SIDE_SLOT_MIN_WIDTH,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    minWidth: SIDE_SLOT_MIN_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backButton: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.sm,
    // Minimum 44 × 44 pt touch target (Apple HIG / Android 48 dp guideline)
    minHeight: 44,
    minWidth: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backLabel: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.regular,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  // ── Authenticated-header additions ──────────────────────────────────────
  /** Wraps avatar image / initials circle. */
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
  },
  avatarInitials: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#ffffff',
  },
  /** Red badge overlaid on the avatar/notification icon. */
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: LightColors.surface, // overridden dynamically
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    lineHeight: 14,
    color: '#ffffff',
  },
  /** Avatar + greeting stacked vertically in the leading slot. */
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  greetingColumn: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  greetingLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    lineHeight: 14,
  },
  greetingName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    lineHeight: 18,
  },
  /** Notification bell wrapper in the trailing slot. */
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeWrapper: {
    position: 'relative',
  },
});
