/**
 * Toast Container Component
 * Manages rendering of all active toast notifications globally
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../context/ToastContext';
import { ToastNotification } from './ToastNotification';

/** Vertical distance between stacked toasts. */
const TOAST_SPACING = 80;

export const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useToast();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View
      // Offset by the top inset rather than pinned to 0: at 0 the first toast
      // renders under the status bar and the notch on every device that has
      // one, which is where its dismiss control sits.
      style={[styles.container, { top: insets.top }]}
      pointerEvents="box-none"
    >
      {toasts.map((toast, index) => (
        <View
          key={toast.id}
          style={[
            styles.toastWrapper,
            {
              top: index * TOAST_SPACING,
            },
          ]}
          pointerEvents="box-none"
        >
          <ToastNotification
            toast={toast}
            onDismiss={hideToast}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
    zIndex: 999,
  },
  toastWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
});
