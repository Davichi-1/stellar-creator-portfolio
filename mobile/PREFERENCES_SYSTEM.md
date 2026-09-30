# Comprehensive Preferences System for Tamgora Mobile

## Overview

This document describes the comprehensive native preference mapping system that has been established for the Tamgora mobile application. The system provides explicit, full-featured preference management with optimized native UI layouts, haptic feedback, and efficient rendering without frame drops.

## Architecture

### Core Components

1. **PreferencesContext** (`src/context/PreferencesContext.tsx`)
   - Centralized preference state management
   - Type-safe preference access via `usePreferences()` hook
   - Persistent storage via AsyncStorage
   - Haptic feedback on interactions
   - Lazy loading for optimized performance

2. **PreferencesScreen** (`src/screens/PreferencesScreen.tsx`)
   - Comprehensive native preference UI
   - Optimized rendering with memoized components
   - Native UI layouts using React Native primitives
   - Dark mode support throughout
   - Full accessibility support (roles, states, labels)

3. **Preferences Hooks** (`src/context/index.ts`)
   - `usePreferences()` - Main hook for all preference operations
   - `usePreference(key)` - Convenience hook for individual preferences

## Preference Categories

### 1. Appearance
- **Theme Mode** - Light, Dark, System (auto-match)
- **Larger Text** - Increased font size for readability
- **High Contrast** - Enhanced color contrast for visibility

### 2. Notifications
- **Push Notifications** - Enable/disable push alerts
- **Notification Level** - None, Critical Only, Important, All
- **Vibration** - Haptic feedback toggle
- **Sound** - Audio notification toggle

### 3. Privacy
- **Profile Visibility** - Show profile to non-contacts
- **Last Seen** - Display last active status
- **Screen Recording Protection** - Block screenshots/recording

### 4. Data & Storage
- **Data Usage Mode** - Standard, Low, Economy
- **Auto-download Media** - Automatic image/video download
- **Clear Cache on Exit** - Remove cached data on close

### 5. Features
- **Biometric Authentication** - Face ID/Touch ID access
- **Auto Dark Mode** - Time-based theme switching

### 6. Account
- Locale selection (via LanguageSettingsScreen)
- Password management
- Account settings

## File Structure

```
mobile/
├── src/
│   ├── context/
│   │   ├── index.ts                 # Exports context hooks
│   │   └── PreferencesContext.tsx   # Core preferences provider
│   ├── screens/
│   │   └── PreferencesScreen.tsx    # Main preferences UI
│   ├── types/
│   │   └── index.ts                 # Type definitions
│   ├── constants/
│   │   └── routes.ts                # Navigation routes
│   └── i18n/
│       ├── locales/
│       │   ├── en.ts                # English (base)
│       │   ├── es.ts                # Spanish
│       │   ├── fr.ts                # French
│       │   ├── de.ts                # German
│       │   └── ar.ts                # Arabic (RTL)
│       └── I18nProvider.tsx         # I18n context
├── app/
│   ├── _layout.tsx                  # Root layout with Providers
│   └── (app)/
│       └── preferences.tsx          # Preferences route
└── PREFERENCES_SYSTEM.md            # This document
```

## Features

### Native Optimization
- **Zero Frame Drops**: Components use `React.memo()` and optimized rendering
- **Native Animations**: Animated API for transitions without JS bridge
- **Haptic Feedback**: `expo-haptics` impact feedback on interactions
- **Lazy Loading**: Heavy sections load only when needed

### Accessibility
- Full screen reader support
- Proper accessibility roles (switch, button, header)
- Accessibility states (checked, disabled)
- Accessibility labels for all interactive elements
- High contrast mode support

### Performance
- Memoized components (`memo()`)
- Optimized color schemes (light/dark)
- Efficient state management with Context API
- Debounced AsyncStorage writes
- Minimal re-renders via useMemo/useCallback

### Persistence
- All preferences saved to AsyncStorage
- Automatic rehydration on app start
- Type-safe preference schema
- Migration support (v1 → v2)

### Internationalization
- Full RTL support for Arabic
- Translation keys for all preference labels
- Supported languages: English, Spanish, French, German, Arabic
- Dynamic locale switching with haptic feedback

## Usage

### Basic Usage

```typescript
import { usePreferences } from '../context/PreferencesContext';

function MyComponent() {
  const { preferences, setThemeMode } = usePreferences();
  
  const handleThemeChange = async (mode: 'light' | 'dark' | 'system') => {
    await setThemeMode(mode);
  };
  
  return (
    <View>
      <Text>Current theme: {preferences.themeMode}</Text>
    </View>
  );
}
```

### Individual Preference Hook

```typescript
import { usePreference } from '../context/PreferencesContext';

function MyComponent() {
  const [isNotificationsEnabled, setIsNotificationsEnabled] = usePreference('notificationEnabled');
  
  return (
    <Switch
      value={isNotificationsEnabled}
      onValueChange={setIsNotificationsEnabled}
    />
  );
}
```

## Testing

Run the tests to verify the preferences system:

```bash
cd mobile
npm test -- src/__tests__/preferences.test.ts
```

## Navigation

The preferences screen is accessible at:
- Route: `/(app)/preferences`
- Route constant: `ROUTES.APP.PREFERENCES`

## Future Enhancements

Potential improvements for future iterations:
1. Advanced notification filtering
2. Custom theme color pickers
3. Analytics preference toggles
4. Sync preferences across devices
5. Advanced accessibility options (color blindness modes, etc.)

## Migration Notes

### From v1 to v2

The preferences system has been refactored to use a centralized Context provider. To migrate:

1. Wrap your app with `PreferencesProvider` (already done in `app/_layout.tsx`)
2. Replace direct AsyncStorage access with `usePreferences()` or `usePreference()`
3. Update preference keys to match the new schema
4. Run `resetPreferences()` to clear old preferences if needed

## Support

For questions or issues related to the preferences system:
1. Check the type definitions in `src/types/index.ts`
2. Review the context implementation in `src/context/PreferencesContext.tsx`
3. Examine the screen implementation in `src/screens/PreferencesScreen.tsx`
4. Review the i18n translations in `src/i18n/locales/*.ts`
