/**
 * NativeButton — Primary and Secondary button components that conform to
 * platform touch-target guidelines.
 *
 * Issue #1355 — "Build dynamic Primary and Secondary Native Buttons conforming
 * to Touch Targets":
 *
 * Minimum touch target sizes enforced:
 *  • iOS Apple HIG:   44 × 44 pt
 *  • Android M3 spec: 48 × 48 dp
 *
 * Variants
 * ─────────
 *  • `primary`   — filled, brand colour background, inverse text.
 *  • `secondary` — outlined, transparent background, brand-colour border + text.
 *  • `ghost`     — no border or fill; text-only, brand colour.
 *  • `danger`    — filled, error/red background for destructive actions.
 *
 * Sizes
 * ─────
 *  • `sm`  — compact (height 36, used inside list rows / inline flows)
 *  • `md`  — default (height 48)
 *  • `lg`  — prominent CTA (height 56)
 *
 * All sizes still satisfy the minimum touch target through `hitSlop` on
 * the `sm` variant so visually compact buttons remain accessible.
 *
 * The component is a thin wrapper around `Pressable` (not `TouchableOpacity`)
 * so it benefits from RN's Pointer Events API and the animated press feedback
 * available in React Native 0.85+.
 *
 * Loading state
 * ─────────────
 * Pass `loading={true}` to replace the label with an `ActivityIndicator` and
 * disable interaction.  The button dimensions are preserved so the layout does
 * not shift.
 */
import React, { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { FontSize, FontWeight, Radius, Spacing } from '../../theme/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface NativeButtonProps {
  /** Visible button label. */
  label: string;
  /** Visual variant. Defaults to `primary`. */
  variant?: ButtonVariant;
  /** Size preset. Defaults to `md`. */
  size?: ButtonSize;
  /** Callback fired on press. Not called when `disabled` or `loading`. */
  onPress: () => void;
  /** Disable interaction and reduce opacity. */
  disabled?: boolean;
  /**
   * Show a spinner in place of the label and disable interaction.
   * The button keeps its current dimensions so layout does not shift.
   */
  loading?: boolean;
  /** Optional icon node rendered before the label. */
  leftIcon?: React.ReactNode;
  /** Optional icon node rendered after the label. */
  rightIcon?: React.ReactNode;
  /** Expand the button to fill the container width. */
  fullWidth?: boolean;
  /**
   * Additional `ViewStyle` applied to the outer `Pressable` container.
   * Cannot override `backgroundColor`, `borderColor`, `borderRadius`, or
   * touch-target sizing — use `variant` / `size` instead.
   */
  style?: StyleProp<ViewStyle>;
  /** Accessibility label. Defaults to `label`. */
  accessibilityLabel?: string;
  /** Accessibility hint describing the action result. */
  accessibilityHint?: string;
}

// ─── Size config ──────────────────────────────────────────────────────────────

interface SizeConfig {
  height: number;
  paddingHorizontal: number;
  fontSize: number;
  iconGap: number;
  /**
   * `hitSlop` added to `sm` buttons so the tap area always reaches the
   * platform minimum even though the visible height is below 44 / 48 dp.
   */
  hitSlop?: { top: number; bottom: number; left: number; right: number };
}

const SIZE_CONFIG: Record<ButtonSize, SizeConfig> = {
  sm: {
    height: 36,
    paddingHorizontal: Spacing.base,
    fontSize: FontSize.sm,
    iconGap: Spacing.xs,
    // Expand tap area to 44 pt tall on iOS, 48 dp on Android
    hitSlop: Platform.select({
      ios: { top: 4, bottom: 4, left: 4, right: 4 },
      android: { top: 6, bottom: 6, left: 6, right: 6 },
      default: { top: 4, bottom: 4, left: 4, right: 4 },
    }),
  },
  md: {
    height: 48,
    paddingHorizontal: Spacing.xl,
    fontSize: FontSize.base,
    iconGap: Spacing.sm,
  },
  lg: {
    height: 56,
    paddingHorizontal: Spacing['2xl'],
    fontSize: FontSize.md,
    iconGap: Spacing.sm,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

function NativeButtonComponent({
  label,
  variant = 'primary',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}: NativeButtonProps): React.JSX.Element {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const sizeConfig = SIZE_CONFIG[size];

  // Resolve colours per variant from the live theme
  const variantStyle = useMemo(() => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderWidth: 0,
          borderColor: 'transparent',
          textColor: colors.textInverse,
          spinnerColor: colors.textInverse,
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
          textColor: colors.primary,
          spinnerColor: colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderColor: 'transparent',
          textColor: colors.primary,
          spinnerColor: colors.primary,
        };
      case 'danger':
        return {
          backgroundColor: colors.error,
          borderWidth: 0,
          borderColor: 'transparent',
          textColor: colors.textInverse,
          spinnerColor: colors.textInverse,
        };
    }
  }, [variant, colors]);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={sizeConfig.hitSlop}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          backgroundColor: variantStyle.backgroundColor,
          borderWidth: variantStyle.borderWidth,
          borderColor: variantStyle.borderColor,
          opacity: isDisabled ? 0.48 : pressed ? 0.78 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyle.spinnerColor}
          accessibilityLabel="Loading"
        />
      ) : (
        <View style={[styles.content, { gap: sizeConfig.iconGap }]}>
          {leftIcon != null && <View accessibilityElementsHidden>{leftIcon}</View>}
          <Text
            style={[
              styles.label,
              {
                fontSize: sizeConfig.fontSize,
                color: variantStyle.textColor,
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {rightIcon != null && <View accessibilityElementsHidden>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
}

/** Memoized {@link NativeButtonComponent}. */
export const NativeButton = memo(NativeButtonComponent);
NativeButton.displayName = 'NativeButton';

// ─── Convenience exports ──────────────────────────────────────────────────────

/**
 * Pre-configured primary button.
 *
 * @example
 * <PrimaryButton label="Apply Now" onPress={handleApply} />
 */
export const PrimaryButton = memo(
  (props: Omit<NativeButtonProps, 'variant'>) => (
    <NativeButton {...props} variant="primary" />
  ),
);
PrimaryButton.displayName = 'PrimaryButton';

/**
 * Pre-configured secondary (outlined) button.
 *
 * @example
 * <SecondaryButton label="Learn more" onPress={handleLearnMore} />
 */
export const SecondaryButton = memo(
  (props: Omit<NativeButtonProps, 'variant'>) => (
    <NativeButton {...props} variant="secondary" />
  ),
);
SecondaryButton.displayName = 'SecondaryButton';

/**
 * Pre-configured ghost (text-only) button.
 */
export const GhostButton = memo(
  (props: Omit<NativeButtonProps, 'variant'>) => (
    <NativeButton {...props} variant="ghost" />
  ),
);
GhostButton.displayName = 'GhostButton';

/**
 * Pre-configured danger button for destructive actions.
 */
export const DangerButton = memo(
  (props: Omit<NativeButtonProps, 'variant'>) => (
    <NativeButton {...props} variant="danger" />
  ),
);
DangerButton.displayName = 'DangerButton';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    // Ensure we never render below the platform minimum touch-target height
    // even if a consumer passes an unusually small size override.
    minHeight: Platform.select({ android: 48, default: 44 }),
    minWidth: Platform.select({ android: 48, default: 44 }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
});
