/**
 * Keyboard Avoiding View Component
 * Automatically adjusts view position when keyboard appears.
 *
 * Uses the `useKeyboardAvoidance` hook's animated translateY exclusively.
 * The native KeyboardAvoidingView has been intentionally removed to avoid
 * double-compensation on iOS (both mechanisms react to the same keyboard
 * event and would shift content up by ~2× the keyboard height).
 *
 * Updated for Issue #798: Precise keyboard avoidance with safe area handling.
 */

import React, { useMemo } from 'react';
import {
  Animated,
  ViewProps,
  StyleSheet,
} from 'react-native';
import { useKeyboardAvoidance } from '../../hooks/useKeyboardAvoidance';

interface KeyboardAvoidingContainerProps extends ViewProps {
  children: React.ReactNode;
  offset?: number;
  safeArea?: boolean;
  topOffset?: number;
  avoidKeyboard?: boolean;
}

export const KeyboardAvoidingContainer: React.FC<KeyboardAvoidingContainerProps> = ({
  children,
  offset = 20,
  safeArea = true,
  topOffset = 0,
  avoidKeyboard = true,
  style,
  ...props
}) => {
  const { animatedValue, height } = useKeyboardAvoidance({
    bottomOffset: offset,
    safeAreaEnabled: safeArea,
  });

  const animatedStyle = useMemo(
    () => ({
      transform: [{ translateY: avoidKeyboard ? -height : topOffset }],
    }),
    [avoidKeyboard, height, topOffset],
  );

  if (!avoidKeyboard) {
    return (
      <View style={[styles.container, style]} {...props}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        style,
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});