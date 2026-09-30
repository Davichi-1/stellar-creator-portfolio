/**
 * Mobile App Entry Point
 * Tamgora Mobile Application
 */

import React, { useEffect } from 'react';
import { registerRootComponent } from 'expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import { ThemeProvider } from './theme/ThemeProvider';
import { NetworkProvider } from './offline/NetworkProvider';
import { I18nProvider } from './i18n/I18nProvider';
import { AppNavigator } from './navigation/AppNavigator';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/Toast/ToastContainer';
import { SentryErrorTracker } from './services/SentryErrorTracker';
import { DistributionConfigManager } from './config/DistributionConfigManager';
import { Platform as DistPlatform } from './config/distributionMappings';

function App() {
  useEffect(() => {
    // Initialize distribution configuration
    const platformMapping: { [key: string]: DistPlatform } = {
      'ios': DistPlatform.IOS,
      'android': DistPlatform.ANDROID,
    };

    const configManager = DistributionConfigManager.initialize(
      platformMapping[Platform.OS] || DistPlatform.IOS,
    );

    // Initialize Sentry error tracking
    const sentryDsn = configManager.getSentryDsn();
    if (sentryDsn) {
      SentryErrorTracker.initialize({
        dsn: sentryDsn,
        enableDebug: configManager.isDebugEnabled(),
        environment: configManager.getReleaseChannel(),
        maxBreadcrumbs: 100,
        tracesSampleRate: 1.0,
      });
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <I18nProvider>
        <ToastProvider>
          <ThemeProvider>
            <NetworkProvider>
              <AppNavigator />
              <ToastContainer />
            </NetworkProvider>
          </ThemeProvider>
        </ToastProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

registerRootComponent(App);

export default App;
