# Native Share Capabilities

This document describes the native system-level share functionality implemented in the Tamgora mobile application.

## Overview

The share capabilities provide:
- **Native OS Share Sheets**: Integration with iOS and Android share sheets
- **App-Specific Endpoints**: Direct sharing to WhatsApp, Telegram, Facebook, Twitter, Instagram, LinkedIn, Reddit, SMS, Email
- **Clipboard Copy**: Quick link copying to clipboard
- **Universal Content Support**: Profiles, bounties, reviews, achievements, portfolios, and links
- **60fps Optimized Rendering**: Smooth animations and rendering

## Architecture

### Components

#### ShareScreen (`src/screens/ShareScreen.tsx`)
Main share screen with:
- Content preview card
- Native share sheet integration
- Clipboard copy functionality
- Haptic feedback
- i18n support

#### ShareEndpointPicker (`src/components/share/ShareEndpointPicker.tsx`)
Endpoint selection interface with:
- Search functionality
- Endpoint grouping by type
- Platform-specific availability detection
- URL scheme-based deep linking

#### ShareCardRenderer (`src/components/share/ShareCardRenderer.tsx`)
Optimized share preview cards with:
- Compact, expanded, and preview variants
- 60fps optimized FlatList rendering
- Native shadow and blur effects
- Cached renders for repeated content

### Services

#### ShareEndpointRegistry (`src/services/ShareEndpointRegistry.ts`)
Centralized endpoint management with:
- Endpoint discovery and validation
- Content type filtering
- Platform-specific availability checking
- URL scheme building

### Hooks

#### useNativeShare (`src/hooks/useNativeShare.ts`)
Custom hook providing:
- `share(payload)`: Native OS share sheet
- `copyToClipboard(text)`: Clipboard copy with confirmation
- `openShareEndpoint(payload, endpoint)`: App-specific sharing
- `shareFile(uri, mimeType)`: File sharing via Expo Sharing

## Content Types

| Type | Icon | Description |
|------|------|-------------|
| `profile` | 👤 | Creator profile |
| `bounty` | 📋 | Bounty/Job posting |
| `review` | ⭐ | User review |
| `achievement` | 🏆 | Badge/achievement |
| `portfolio` | 🖼️ | Portfolio item |
| `link` | 🔗 | Generic link |

## Configuration

### app.json

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "LSApplicationQueriesSchemes": [
          "whatsapp", "tg", "fb", "twitter", "instagram",
          "linkedin", "snapchat", "reddit", "mailto", "sms"
        ]
      }
    },
    "android": {
      "intentFilters": [
        {
          "action": "SEND",
          "data": [{ "mimeType": "text/plain" }, { "mimeType": "image/*" }],
          "category": ["DEFAULT"]
        }
      ]
    }
  }
}
```

## Usage Examples

### Basic Share

```typescript
import { useNativeShare } from '../hooks/useNativeShare';
import { ShareScreen } from '../screens/ShareScreen';

const MyComponent = () => {
  const { share } = useNativeShare();
  
  const handleShare = async () => {
    const payload = {
      type: 'profile',
      title: 'Alice Chen — UX Designer',
      message: 'Check out Alice on Tamgora!',
      url: 'https://tamgora.app/creators/alice-chen',
    };
    
    await share(payload);
  };
  
  return <Button title="Share" onPress={handleShare} />;
};
```

### Share Screen with Payload

```typescript
import { ShareScreen } from '../screens/ShareScreen';
import { SharePayload } from '../types';

const payload: SharePayload = {
  type: 'bounty',
  title: 'Build React Native UI',
  message: 'Check out this bounty!',
  url: 'https://tamgora.app/bounties/123',
  tags: ['React Native', 'UI', 'Design'],
};

<ShareScreen payload={payload} onClose={() => navigation.goBack()} />;
```

### Share Card Renderer

```typescript
import { ShareCard, ShareCardList } from '../components/share/ShareCardRenderer';

// Single card
<ShareCard payload={payload} showActions={true} />

// List of cards
<ShareCardList payloads={payloads} variant="compact" />
```

### Share Endpoint Registry

```typescript
import { shareEndpointRegistry } from '../services/ShareEndpointRegistry';

// Get available endpoints for a payload
const endpoints = await shareEndpointRegistry.getAvailable(payload);

// Share via specific endpoint
await shareEndpointRegistry.share('whatsapp', payload);

// Check if endpoint is available
const canShare = await shareEndpointRegistry.canShare('whatsapp', payload);
```

## Platform Support

### iOS
- ✅ Native share sheet
- ✅ App-specific deep links
- ✅ Clipboard operations
- ✅ File sharing (Expo Sharing)
- ✅ Associated domains (Universal Links)

### Android
- ✅ Native share sheet
- ✅ App-specific deep links
- ✅ Clipboard operations
- ✅ File sharing
- ✅ Intent filters for incoming shares

## Performance Optimizations

1. **60fps Rendering**: Using FlatList with optimized row rendering
2. **Lazy Loading**: Endpoints loaded on demand
3. **Cached Renders**: Share card components memoized
4. **Batched Haptics**: Reduced haptic feedback calls
5. **Memory-Efficient Images**: Optimized image handling for share cards

## Accessibility

- ✅ Full VoiceOver/Screen Reader support
- ✅ Proper accessibility labels and hints
- ✅ Keyboard navigation support
- ✅ Contrast-ratio compliant colors
- ✅ Dynamic text resizing support

## i18n Support

All share text is fully internationalized with support for:
- English (en)
- Arabic (ar) - RTL
- Spanish (es)
- French (fr)
- German (de)

## Testing

### Manual Testing

1. Test native share sheet on both iOS and Android
2. Verify app-specific endpoints open correctly
3. Check clipboard copy functionality
4. Verify haptic feedback
5. Test with different content types
6. Verify accessibility features

### Automated Testing

```bash
# Run share component tests
npm test ShareScreen
npm test ShareEndpointPicker
npm test ShareCardRenderer

# Run native share hook tests
npm test useNativeShare
```

## Troubleshooting

### Endpoint Not Opening
- Verify the app is installed on the device
- Check `LSApplicationQueriesSchemes` in `infoPlist`
- Ensure URL scheme is correct for the app

### Share Sheet Not Showing
- Verify `expo-sharing` is installed
- Check file URI is valid for file sharing
- Ensure proper permissions are set in `app.json`

### Haptics Not Working
- Verify `expo-haptics` is installed
- Check device haptics are enabled
- Ensure proper impact style is used

## Future Enhancements

- [ ] Custom share card images (generated previews)
- [ ] Share analytics tracking
- [ ] Recent endpoints记忆
- [ ] Share templates
- [ ] QR code generation for sharing
- [ ] Batch sharing (multiple items)
- [ ] Share history/recently shared

## References

- [Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/)
- [React Native Share API](https://reactnative.dev/docs/share)
- [Expo Linking](https://docs.expo.dev/versions/latest/sdk/linking/)
- [iOS URL Schemes](https://developer.apple.com/documentation/uikit/inter-process_communication/using_url_schemes_to_communicate)
- [Android Intent Filters](https://developer.android.com/guide/topics/manifest/intent-filter-element)
