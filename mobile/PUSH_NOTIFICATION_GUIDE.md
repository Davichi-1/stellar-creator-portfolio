# Expo Push Notification Integration Guide

## Overview

This document describes the comprehensive Expo Push Notification integration that has been established for the Tamgora mobile application. The system provides secure, native push notification workflows with excellent capabilities for user expectations.

## Architecture

### Core Components

1. **PushNotificationService** (`src/services/PushNotificationService.ts`)
   - Secure push notification handling with Expo SDK
   - Permission management with user-friendly prompts
   - Background message handling
   - Notification actions and categories
   - Rich notification content support
   - Haptic feedback on received notifications
   - Zero frame drops with optimized rendering

2. **PushNotificationContext** (`src/context/PushNotificationContext.tsx`)
   - Centralized push notification state management
   - Automatic initialization on mount
   - Reactivity via Context API
   - Type-safe access via `usePushNotification()` hook
   - Zero frame drops with optimized rendering

3. **PushNotification Components** (`src/components/PushNotification/`)
   - `PushNotificationIcon` - Icon with badge support
   - `NotificationCard` - Card display for individual notifications
   - `AggregatedNotificationGroup` - Collapsible notification groups
   - `NotificationSettingsToggle` - Settings toggle with haptic feedback

## Features

### Permission Management
- **iOS**: Full control over alert, badge, sound, and announcement permissions
- **Android**: Channel configuration with custom vibration patterns
- **Smart prompts**: Permission requests时机 based on user actions
- **Persistent storage**: Permission status saved across sessions

### Notification Categories
- **Messages** (💬) - Blue accent, priority handling
- **Bounties** (💰) - Indigo accent, special actions
- **Alerts** (⚠️) - Red accent, urgent handling
- **Promo** (🎉) - Amber accent, special styling
- **General** (🔔) - Primary accent, standard handling

### Aggregation System
- **Grouping Logic**: Notifications grouped by category + sender
- **Smart Digest**: Automatic grouping for similar notifications
- **Relevance Scoring**: Prioritize important notifications
- **Quiet Hours**: Support for non-interruptive mode

### Local Notifications
- **Immediate**: `sendLocalNotification()`
- **Scheduled**: `scheduleNotification()`
- **Cancellable**: Individual or all notifications
- **Rich Content**: Custom data payloads supported

### Settings Management
- **Sound toggle**: Enable/disable notification sounds
- **Vibration toggle**: Enable/disable haptic feedback
- **Badge toggle**: Enable/disable app icon badge
- **Critical alerts**: Optional critical alert support
- **Lock screen visibility**: Control lock screen display
- **Notification center**: Control notification center display
- **Show previews**: Control preview visibility

## File Structure

```
mobile/
├── src/
│   ├── components/
│   │   └── PushNotification/
│   │       ├── index.ts                     # Barrel exports
│   │       ├── PushNotificationIcon.tsx     # Bell icon with badge
│   │       ├── NotificationCard.tsx         # Individual notification
│   │       ├── AggregatedNotificationGroup.tsx  # Grouped display
│   │       └── NotificationSettingsToggle.tsx   # Settings toggle
│   ├── context/
│   │   ├── index.ts                         # Context exports
│   │   └── PushNotificationContext.tsx      # Provider and hooks
│   ├── services/
│   │   ├── NotificationAggregator.ts        # Existing aggregator
│   │   └── PushNotificationService.ts       # New push service
│   └── types/
│       └── index.ts                         # Type definitions
├── app/
│   └── (app)/
│       └── preferences.tsx                  # Preferences route
├── app.json                                 # Plugin configuration
├── package.json                             # Dependencies
├── PUSH_NOTIFICATION_GUIDE.md              # This document
└── PREFERENCES_SYSTEM.md                   # Preferences docs
```

## Usage

### Basic Setup

The service is automatically initialized when the app starts (via `PushNotificationProvider` in the root layout).

### Check Notification Status

```typescript
import { usePushNotification } from '../context/PushNotificationContext';

function MyComponent() {
  const { state, isNotificationsEnabled, hasPermission } = usePushNotification();
  
  return (
    <View>
      <Text>Notifications enabled: {isNotificationsEnabled ? 'Yes' : 'No'}</Text>
      <Text>Has permission: {hasPermission ? 'Yes' : 'No'}</Text>
      <Text>FCM Token: {state.fcmToken || 'Loading...'}</Text>
    </View>
  );
}
```

### Request Permission

```typescript
import { usePushNotification } from '../context/PushNotificationContext';

function MyComponent() {
  const { requestPermission } = usePushNotification();
  
  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      console.log('Notifications enabled!');
    }
  };
  
  return (
    <Button
      title="Enable Notifications"
      onPress={handleRequestPermission}
    />
  );
}
```

### Send Local Notification

```typescript
import { usePushNotification } from '../context/PushNotificationContext';

function MyComponent() {
  const { sendLocalNotification } = usePushNotification();
  
  const handleSendNotification = async () => {
    await sendLocalNotification(
      'New Message',
      'You have a new message from Sarah',
      { 
        category: 'message',
        senderId: 'sarah-123',
        priority: 'high',
      }
    );
  };
  
  return (
    <Button
      title="Send Test Notification"
      onPress={handleSendNotification}
    />
  );
}
```

### Schedule Notification

```typescript
import { usePushNotification } from '../context/PushNotificationContext';

function MyComponent() {
  const { scheduleNotification } = usePushNotification();
  
  const handleScheduleNotification = async () => {
    // Send reminder in 5 minutes
    await scheduleNotification(
      'Reminder',
      'Don\'t forget to check your bounties!',
      5 * 60, // 5 minutes in seconds
      { category: 'alert' }
    );
  };
  
  return (
    <Button
      title="Schedule Reminder"
      onPress={handleScheduleNotification}
    />
  );
}
```

### Update Settings

```typescript
import { usePushNotification } from '../context/PushNotificationContext';

function MyComponent() {
  const { updateSettings } = usePushNotification();
  
  const handleToggleSound = async (enabled: boolean) => {
    await updateSettings({ sound: enabled });
  };
  
  return (
    <Switch
      value={true} // Get from state.notificationSettings
      onValueChange={handleToggleSound}
    />
  );
}
```

### Use Notification Components

```typescript
import { PushNotificationIcon, AggregatedNotificationGroup } from '../components/PushNotification';

function NotificationPanel() {
  const { state } = usePushNotification();
  
  return (
    <View>
      {/* Bell Icon with Badge */}
      <PushNotificationIcon
        notificationCount={state.recentNotifications.length}
        onPress={() => console.log('Notifications tapped')}
      />
      
      {/* Aggregated Notification Groups */}
      {state.recentNotifications.map((notification) => {
        // Convert to RawNotification for AggregatedNotificationGroup
        return <NotificationCard key={notification.id} notification={notification} />;
      })}
    </View>
  );
}
```

## Advanced Features

### Custom Notification Actions

```typescript
// In PushNotificationService.configureAndroidChannel()
await Notifications.setNotificationCategoryAsync('bounty', [
  {
    identifier: 'view_bounty',
    buttonTitle: 'View Bounty',
  },
  {
    identifier: 'accept_bounty',
    buttonTitle: 'Accept',
  },
]);
```

### Background Notification Handling

```typescript
// In your app entry point or service worker
Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowAlert: notification.request.content.shouldShowAlert ?? true,
    shouldPlaySound: notification.request.content.shouldPlaySound ?? true,
    shouldSetBadge: notification.request.content.shouldSetBadge ?? true,
  }),
});
```

### Deep Linking from Notifications

```typescript
import { usePushNotification } from '../context/PushNotificationContext';
import { ROUTES } from '../constants/routes';

function NotificationHandler() {
  const { state } = usePushNotification();
  
  // Handle notification responses
  useEffect(() => {
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string>;
        
        if (data.bountyId) {
          // Navigate to bounty detail
          // router.push(ROUTES.APP.BOUNTY_DETAIL + '/' + data.bountyId);
        }
      }
    );
    
    return () => responseListener.remove();
  }, []);
  
  return null;
}
```

## Configuration

### app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6366f1",
          "sounds": ["./assets/notification-sounds/default.mp3"],
          "android": {
            "useNextNotificationsApi": true
          }
        }
      ]
    ]
  }
}
```

### Android Setup

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

### iOS Setup

Enable Push Notifications in Xcode:
1. Open `ios/Tamgora.xcworkspace`
2. Select target → Capabilities
3. Enable "Push Notifications"
4. Enable "Background Modes" with "Remote notifications"

## Testing

### Test Local Notifications

```bash
# In development
npx expo start

# Test notification
curl -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "title": "Test Notification",
    "body": "This is a test notification"
  }'
```

### Check Notification Status

```typescript
import { usePushNotification } from '../context/PushNotificationContext';

function DebugScreen() {
  const { state, checkPermission } = usePushNotification();
  
  return (
    <ScrollView>
      <Text>Initialized: {state.isInitialized ? 'Yes' : 'No'}</Text>
      <Text>Has Permission: {state.hasPermission ? 'Yes' : 'No'}</Text>
      <Text>FCM Token: {state.fcmToken}</Text>
      <Text>Settings: {JSON.stringify(state.notificationSettings, null, 2)}</Text>
      
      <Button
        title="Check Permission"
        onPress={checkPermission}
      />
    </ScrollView>
  );
}
```

## Troubleshooting

### Notifications Not Arriving

1. **Check permissions**: `usePushNotification().hasPermission`
2. **Check FCM token**: `usePushNotification().state.fcmToken`
3. **Check network**: Ensure device has internet connection
4. **Check app state**: Background notifications may be delayed on iOS

### Permission Requests Not Showing

1. **Call on user action**: Permission requests must be triggered by user interaction
2. **Check previous denial**: Users may have permanently denied permission
3. **Guide user to settings**: Provide clear instructions for manual enablement

### Notifications Not Clickable

1. **Add notification handler**: Implement `Notifications.addNotificationResponseReceivedListener`
2. **Configure categories**: Set up notification categories with actions
3. **Check payload**: Ensure notification contains valid data

## Performance Considerations

- **Zero Frame Drops**: Components use `React.memo()` and optimized rendering
- **Efficient State**: Minimal re-renders via Context API
- **Aggregation**: Batch similar notifications to reduce UI updates
- **Lazy Loading**: Heavy components load only when needed

## Accessibility

- Full screen reader support
- Proper accessibility roles (switch, button, header)
- Accessibility states (checked, disabled)
- Accessibility labels for all interactive elements

## Future Enhancements

Potential improvements:
1. Advanced notification filtering
2. Custom notification sounds
3. Rich notification media (images, videos)
4. Notification group management UI
5. Analytics integration for notification engagement
6. A/B testing for notification strategies

## Support

For questions or issues related to push notifications:
1. Check the type definitions in `src/services/PushNotificationService.ts`
2. Review the context implementation in `src/context/PushNotificationContext.tsx`
3. Examine the component implementations in `src/components/PushNotification/`
4. Review the plugin configuration in `app.json`
