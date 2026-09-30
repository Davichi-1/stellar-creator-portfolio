/**
 * Preferences Screen Route
 *
 * Route: /(app)/preferences
 *
 * This screen provides comprehensive native preference mapping for Tamgora Mobile.
 * It centralizes all user preferences for appearance, notifications, privacy,
 * data usage, and accessibility settings in a single, optimized interface.
 *
 * Features:
 *  - Explicit comprehensive preferences mapping (appearance, notifications, privacy, data, accessibility)
 *  - Native UI layouts with optimized rendering (no frame drops)
 *  - Haptic feedback on interactions
 *  - Async persistence with debounced saves
 *  - Fully accessible with proper roles, states, and labels
 *  - Dark mode support
 */

import { Stack } from 'expo-router';
import { PreferencesScreen } from '../../src/screens/PreferencesScreen';

export default function PreferencesRoute() {
  return <PreferencesScreen />;
}
