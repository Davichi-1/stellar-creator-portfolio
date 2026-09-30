/**
 * Design tokens — Tamgora brand palette, light + dark variants.
 */

export const LightColors = {
  background:      '#ffffff',
  surface:         '#f8fafc',
  surfaceElevated: '#f1f5f9',
  border:          '#e2e8f0',
  borderStrong:    '#cbd5e1',
  text:            '#0f172a',
  textSecondary:   '#475569',
  textTertiary:    '#94a3b8',
  textInverse:     '#ffffff',
  placeholder:     '#94a3b8',
} as const;

export const DarkColors = {
  background:      '#0f172a',
  surface:         '#1e293b',
  surfaceElevated: '#334155',
  border:          '#334155',
  borderStrong:    '#475569',
  text:            '#f8fafc',
  textSecondary:   '#cbd5e1',
  textTertiary:    '#64748b',
  textInverse:     '#0f172a',
  placeholder:     '#64748b',
} as const;

export const BrandColors = {
  primary:       '#6366f1',
  primaryDark:   '#4f46e5',
  primaryLight:  '#a5b4fc',
  accent:        '#f59e0b',
  accentLight:   '#fde68a',
  success:       '#22c55e',
  successLight:  '#bbf7d0',
  warning:       '#f59e0b',
  warningLight:  '#fef3c7',
  error:         '#ef4444',
  errorLight:    '#fee2e2',
  info:          '#3b82f6',
  infoLight:     '#dbeafe',
  starFilled:    '#f59e0b',
  starEmpty:     '#e2e8f0',
} as const;

export const Spacing = {
  xs:    4,
  sm:    8,
  md:    12,
  base:  16,
  lg:    20,
  xl:    24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const Radius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  '2xl': 20,
  full: 9999,
} as const;

export const FontSize = {
  xs:    11,
  sm:    13,
  base:  15,
  md:    16,
  lg:    18,
  xl:    20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export const FontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// ─── Unified Colors (default: light scheme) ───────────────────────────────────
// Components that import `Colors` from this file get a flat palette ready for use.

export const Colors = {
  // Surface & layout
  background:      LightColors.background,
  surface:         LightColors.surface,
  surfaceElevated: LightColors.surfaceElevated,
  border:          LightColors.border,
  borderStrong:    LightColors.borderStrong,

  // Text
  text:            LightColors.text,
  textSecondary:   LightColors.textSecondary,
  textTertiary:    LightColors.textTertiary,
  textInverse:     LightColors.textInverse,
  placeholder:     LightColors.placeholder,

  // Brand
  primary:         BrandColors.primary,
  primaryDark:     BrandColors.primaryDark,
  primaryLight:    BrandColors.primaryLight,
  accent:          BrandColors.accent,
  accentLight:     BrandColors.accentLight,
  success:         BrandColors.success,
  successLight:    BrandColors.successLight,
  warning:         BrandColors.warning,
  warningLight:    BrandColors.warningLight,
  error:           BrandColors.error,
  errorLight:      BrandColors.errorLight,
  info:            BrandColors.info,
  infoLight:       BrandColors.infoLight,
  starFilled:      BrandColors.starFilled,
  starEmpty:       BrandColors.starEmpty,

  // Activity event-type colours
  eventBounty:  '#6366f1', // indigo — bounty actions
  eventReview:  '#f59e0b', // amber  — review actions
  eventPayment: '#22c55e', // green  — payment actions
  eventMessage: '#06b6d4', // cyan   — messaging
  eventProfile: '#8b5cf6', // violet — profile views
  eventMatch:   '#3b82f6', // blue   — match events
  eventDispute: '#ef4444', // red    — dispute events
} as const;
