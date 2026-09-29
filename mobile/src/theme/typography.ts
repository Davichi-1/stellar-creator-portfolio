/**
 * Typography scale for the Tamgora design system.
 *
 * Each variant is a fully-resolved native text style (fontSize, lineHeight,
 * fontWeight, letterSpacing).  Consume these through the {@link Text} component
 * rather than hardcoding values in screens.
 *
 * Issue #1354 — "Define standard native precise Typography styles matching
 * current design system": added letterSpacing per variant, an `overline`
 * variant, a `code` variant for monospaced display, button-label variants,
 * and a `createTypographyStyle` helper that scales values to the system
 * font-size setting.
 */
import type { TextStyle } from 'react-native';

// ─── Font family stacks ────────────────────────────────────────────────────────

/**
 * Platform-resolved font-family stacks.  Expo / React Native lets the OS pick
 * the right file when a generic family name is given, so we only specify a
 * custom family name when loading a custom font.
 */
export const FontFamilies = {
  /** Default system sans-serif (San Francisco on iOS, Roboto on Android). */
  sansSerif: undefined as undefined, // RN default — no value needed
  /** Monospaced system font used for code snippets. */
  monospace: 'Courier New',
} as const;

// ─── Named typography variants ────────────────────────────────────────────────

/**
 * Every variant is typed as a `TextStyle` subset so it can be spread directly
 * into a `StyleSheet`.  `as const satisfies` keeps each `fontWeight` as a
 * string-literal type that React Native accepts.
 *
 * Design decisions
 * ────────────────
 * • `lineHeight` = `fontSize × 1.35` (display) or `fontSize × 1.5` (body).
 * • `letterSpacing` follows iOS HIG recommendations (tighter for large text,
 *   looser for small caps / labels).
 * • All sizes are in logical pixels (dp on Android, pt on iOS).
 */
export const typography = {
  // ── Display ──────────────────────────────────────────────────────────────
  displayLarge: {
    fontSize: 40,
    lineHeight: 52,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  displayMedium: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // ── Headings ──────────────────────────────────────────────────────────────
  headingLarge: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headingMedium: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  headingSmall: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0.15,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0.2,
  },

  // ── Label / supporting ────────────────────────────────────────────────────
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  caption: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },

  // ── Button labels ─────────────────────────────────────────────────────────
  buttonLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  buttonMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  buttonSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Code / monospace ──────────────────────────────────────────────────────
  code: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0,
    fontFamily: FontFamilies.monospace,
  },
} as const satisfies Record<string, TextStyle>;

/** Union of every available typography variant name. */
export type TypographyVariant = keyof typeof typography;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Scale a typography variant by an arbitrary font-scale factor.
 *
 * Used by the `Text` component to honour the device accessibility font-size
 * setting without clamping (the caller decides whether to clamp).
 *
 * @param variant  - The base variant to scale.
 * @param scale    - Multiplicative scale factor (e.g. `1.15` for large text).
 * @returns A `TextStyle` object with `fontSize` and `lineHeight` scaled.
 */
export function createTypographyStyle(
  variant: TypographyVariant,
  scale: number,
): TextStyle {
  const base = typography[variant];
  return {
    ...base,
    fontSize: base.fontSize * scale,
    lineHeight: base.lineHeight * scale,
  };
}
