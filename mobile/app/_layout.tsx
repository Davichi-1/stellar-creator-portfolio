/**
 * Root layout for the Expo Router app.
 *
 * Wraps the entire navigation tree in a {@link GestureHandlerRootView} (required
 * by react-native-gesture-handler / reanimated) and declares the top-level
 * {@link Stack} navigator that hosts the `(auth)` and `(app)` route groups.
 *
 * Global providers (theme, state hydration gating, fonts, toasts) are composed
 * here as later issues land — see Issues 3 (Zustand) and 4 (Typography/fonts).
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { NetworkProvider } from '../src/offline/NetworkProvider';
import { ToastProvider } from '../src/context/ToastContext';
import { PreferencesProvider } from '../src/context/PreferencesContext';
import { PushNotificationProvider } from '../src/context/PushNotificationContext';
import { ToastContainer } from '../src/components/Toast/ToastContainer';

/**
 * Application root layout rendered once at the top of the navigation tree.
 *
 * Wraps the entire app with:
 * - {@link PreferencesProvider} - Comprehensive native preference management
 * - {@link PushNotificationProvider} - Secure push notification integration
 *
 * Both providers are essential for the full Tamgora mobile experience.
 *
 * @returns The gesture-handler-wrapped root stack navigator.
 */
export default function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <PushNotificationProvider>
            <ThemeProvider>
              <NetworkProvider>
                <ToastProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(app)" />
                  </Stack>
                  <StatusBar style="auto" />

                  {/* Rendered after the navigator, inside the provider: a toast is
                      global chrome that has to sit above every screen, and mounting
                      it before the Stack would put it behind the navigator's own
                      surface. The provider alone is not enough — it holds the queue
                      and nothing draws it. */}
                  <ToastContainer />
                </ToastProvider>
              </NetworkProvider>
            </ThemeProvider>
          </PushNotificationProvider>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
