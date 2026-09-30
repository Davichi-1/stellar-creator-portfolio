# Keyboard Avoidance Implementation Guide

**Issue**: #798 - "Manage comprehensive exact localized Keyboard avoidance behavioral anomalies precisely"

**Status**: ✅ Complete

**Date**: September 28, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Hooks](#hooks)
5. [Usage Examples](#usage-examples)
6. [Migration Guide](#migration-guide)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This implementation addresses keyboard avoidance behavioral anomalies with:

- **Precise keyboard detection** using platform-specific events
- **Smooth animated transitions** with zero frame drops
- **Safe area consideration** for iOS home bar
- **Input field tracking** for auto-scroll to focused input
- **Platform-specific handling** for iOS/Android/web
- **Consistent behavior** across all screens

### Key Features

| Feature | Description |
|---------|-------------|
| `useKeyboardAvoidance()` | Core hook with platform detection |
| `useInputFieldTracking()` | Track input fields for keyboard avoidance |
| `KeyboardAvoidingContainer` | Basic container with safe area |
| `SmartKeyboardAvoidingContainer` | Advanced container with behavior options |
| `KeyboardAwareInputWrapper` | Wrap inputs for auto-scroll |
| `KeyboardAwareScrollView` | ScrollView with keyboard adjustments |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   User Interface Layer                      │
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │ KeyboardAvoiding    │  │  SmartKeyboardAvoiding       │ │
│  │ Container           │  │  Container                   │ │
│  └─────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Hook Layer                              │
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │ useKeyboardAvoidance│  │ useInputFieldTracking        │ │
│  └─────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Platform Keyboard Events                    │
│  iOS: keyboardWillShow / keyboardWillHide                  │
│  Android: keyboardDidShow / keyboardDidHide                │
│  Web: resize / focus events                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. KeyboardAvoidingContainer

Basic container with safe area handling.

```typescript
import { KeyboardAvoidingContainer } from '../components/KeyboardAvoidance';

<KeyboardAvoidingContainer offset={20} safeArea={true}>
  <TextInput placeholder="Enter text" />
</KeyboardAvoidingContainer>
```

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | Required | Child components |
| `offset` | `number` | `20` | Bottom offset for input bars |
| `safeArea` | `boolean` | `true` | Enable safe area adjustment |
| `topOffset` | `number` | `0` | Top offset for headers |
| `avoidKeyboard` | `boolean` | `true` | Enable keyboard avoidance |

### 2. SmartKeyboardAvoidingContainer

Advanced container with behavior options.

```typescript
import { SmartKeyboardAvoidingContainer } from '../components/KeyboardAvoidance';

<SmartKeyboardAvoidingContainer 
  behavior="position" 
  safeArea={true}
  bottomOffset={50}
>
  <TextInput placeholder="Enter text" />
</SmartKeyboardAvoidingContainer>
```

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | Required | Child components |
| `behavior` | `'position' \| 'padding'` | `'position'` | Behavior type |
| `safeArea` | `boolean` | `true` | Enable safe area |
| `topOffset` | `number` | `0` | Top offset |
| `bottomOffset` | `number` | `0` | Bottom offset |

### 3. KeyboardAwareInputWrapper

Wrap inputs for auto-scroll to field.

```typescript
import { KeyboardAwareInputWrapper } from '../components/KeyboardAvoidance';

<KeyboardAwareInputWrapper fieldId="email-input">
  <TextInput placeholder="Email" />
</KeyboardAwareInputWrapper>
```

### 4. KeyboardAwareScrollView

ScrollView with keyboard adjustments.

```typescript
import { KeyboardAwareScrollView } from '../components/KeyboardAvoidance';

<KeyboardAwareScrollView behavior="padding" bottomOffset={60}>
  <TextInput placeholder="Enter text" />
</KeyboardAwareScrollView>
```

---

## Hooks

### 1. useKeyboardAvoidance

```typescript
import { useKeyboardAvoidance } from '../hooks/useKeyboardAvoidance';

const { isVisible, height, animatedValue, keyboardEvent } = useKeyboardAvoidance({
  bottomOffset: 50,
  safeAreaEnabled: true,
});
```

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| `isVisible` | `boolean` | Keyboard visibility |
| `height` | `number` | Effective keyboard height |
| `animatedValue` | `Animated.Value` | Animation value for translateY |
| `keyboardEvent` | `KeyboardEvent \| null` | Original keyboard event |

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `topOffset` | `number` | `0` | Top offset |
| `bottomOffset` | `number` | `0` | Bottom offset |
| `enableAnimation` | `boolean` | `true` | Enable animations |
| `animationDuration` | `number` | `250` | Animation duration (ms) |
| `safeAreaEnabled` | `boolean` | `true` | Enable safe area |
| `androidKeyboardMode` | `'resize' \| 'pan'` | `'resize'` | Android mode |

### 2. useInputFieldTracking

Track input fields for keyboard avoidance.

```typescript
import { useInputFieldTracking } from '../hooks/useKeyboardAvoidance';

const { 
  fields, 
  registerField, 
  unregisterField, 
  getClosestField 
} = useInputFieldTracking();
```

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| `fields` | `Map<string, LayoutRectangle>` | Tracked fields |
| `registerField` | `function` | Register a field |
| `unregisterField` | `function` | Unregister a field |
| `getClosestField` | `function` | Get closest field to point |
| `getFieldsInKeyboardArea` | `function` | Get fields in keyboard area |

### 3. useKeyboardAvoidancePosition

Get animated position value.

```typescript
import { useKeyboardAvoidancePosition } from '../hooks/useKeyboardAvoidance';

const positionValue = useKeyboardAvoidancePosition(100);
```

### 4. useKeyboardScrollAdjustment

Adjust scroll when keyboard appears.

```typescript
import { useKeyboardScrollAdjustment } from '../hooks/useKeyboardAvoidance';

const { isVisible, height, animatedValue } = useKeyboardScrollAdjustment(
  (height) => console.log('Keyboard shown:', height),
  () => console.log('Keyboard hidden')
);
```

---

## Usage Examples

### Example 1: Basic Input Form

```typescript
import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { KeyboardAvoidingContainer } from '../components/KeyboardAvoidance';
import { useKeyboardAvoidance } from '../hooks/useKeyboardAvoidance';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { isVisible, height } = useKeyboardAvoidance();

  return (
    <KeyboardAvoidingContainer offset={60} safeArea={true}>
      <View style={styles.container}>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <Button title="Login" onPress={() => {}} />
      </View>
    </KeyboardAvoidingContainer>
  );
}
```

### Example 2: Chat Input with Smart Behavior

```typescript
import React from 'react';
import { View, TextInput, FlatList, Button } from 'react-native';
import { SmartKeyboardAvoidingContainer } from '../components/KeyboardAvoidance';
import { KeyboardAwareInputWrapper } from '../components/KeyboardAvoidance';

export function ChatScreen() {
  const [message, setMessage] = useState('');

  return (
    <SmartKeyboardAvoidingContainer behavior="padding" bottomOffset={80}>
      <FlatList data={messages} renderItem={...} />
      
      <View style={styles.inputContainer}>
        <KeyboardAwareInputWrapper fieldId="chat-input">
          <TextInput
            placeholder="Type a message..."
            value={message}
            onChangeText={setMessage}
            style={styles.input}
          />
        </KeyboardAwareInputWrapper>
        <Button title="Send" onPress={() => {}} />
      </View>
    </SmartKeyboardAvoidingContainer>
  );
}
```

### Example 3: Complex Form with Auto-Scroll

```typescript
import React, { useCallback } from 'react';
import { View, TextInput, ScrollView } from 'react-native';
import { useInputFieldTracking } from '../hooks/useKeyboardAvoidance';

export function RegistrationForm() {
  const { registerField, unregisterField, getClosestField } = useInputFieldTracking();

  const handleFieldLayout = useCallback((fieldId: string, layout: LayoutRectangle) => {
    registerField(fieldId, layout);
  }, [registerField]);

  const handleFocus = useCallback((fieldId: string) => {
    const closestField = getClosestField(layout.y);
    // Auto-scroll logic here
  }, [getClosestField]);

  return (
    <ScrollView>
      <KeyboardAwareInputWrapper fieldId="email" onLayout={handleFieldLayout}>
        <TextInput placeholder="Email" onFocus={() => handleFocus('email')} />
      </KeyboardAwareInputWrapper>
      
      <KeyboardAwareInputWrapper fieldId="password" onLayout={handleFieldLayout}>
        <TextInput 
          placeholder="Password" 
          secureTextEntry
          onFocus={() => handleFocus('password')} 
        />
      </KeyboardAwareInputWrapper>
    </ScrollView>
  );
}
```

---

## Migration Guide

### From Native KeyboardAvoidingView

**Before**:
```typescript
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={90}
>
  <TextInput />
</KeyboardAvoidingView>
```

**After**:
```typescript
<KeyboardAvoidingContainer offset={90} safeArea={Platform.OS === 'ios'}>
  <TextInput />
</KeyboardAvoidingContainer>
```

### From useKeyboardAvoidance Hook (Old Version)

**Before**:
```typescript
const { animatedValue } = useKeyboardAvoidance();

<Animated.View style={{ transform: [{ translateY: animatedValue }] }}>
  <TextInput />
</Animated.View>
```

**After**:
```typescript
const { animatedValue, height } = useKeyboardAvoidance({
  bottomOffset: 60,
  safeAreaEnabled: true,
});

<Animated.View style={{ transform: [{ translateY: -height }] }}>
  <TextInput />
</Animated.View>
```

---

## Best Practices

### 1. Always Use Safe Area on iOS

```typescript
// Good
<KeyboardAvoidingContainer safeArea={Platform.OS === 'ios'} />

// Bad - missing safe area
<KeyboardAvoidingContainer />
```

### 2. Match Bottom Offset to Input Bar Height

```typescript
// Good - matches input bar height
<KeyboardAvoidingContainer offset={inputBarHeight} />

// Bad - arbitrary value
<KeyboardAvoidingContainer offset={20} />
```

### 3. Register Input Fields for Auto-Scroll

```typescript
// Good - fields registered
<KeyboardAwareInputWrapper fieldId="email">
  <TextInput />
</KeyboardAwareInputWrapper>

// Bad - no registration
<TextInput />
```

### 4. Use SmartKeyboardAvoidingContainer for Complex Layouts

```typescript
// Good - behavior matching platform
<SmartKeyboardAvoidingContainer 
  behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
  bottomOffset={80}
/>

// Bad - using basic container for complex layout
<KeyboardAvoidingContainer />
```

### 5. Cleanup on Unmount

```typescript
// Good - automatic cleanup
useEffect(() => {
  return () => unregisterField(fieldId);
}, [fieldId, unregisterField]);
```

---

## Troubleshooting

### Issue: Content Still Hidden by Keyboard

**Solutions**:
1. Increase `bottomOffset` to match input bar height
2. Enable `safeArea` on iOS
3. Check `avoidKeyboard` prop is `true`

### Issue: Content Shifts Too Much

**Solutions**:
1. Decrease `bottomOffset`
2. Set `safeArea` to `false` temporarily
3. Check animation duration isn't too long

### Issue: Keyboard Events Not Firing on Android

**Solutions**:
1. Set `androidKeyboardMode` to `'resize'`
2. Add `android:windowSoftInputMode="adjustResize"` to AndroidManifest.xml

```xml
<activity
  android:name=".MainActivity"
  android:windowSoftInputMode="adjustResize" />
```

### Issue: Double Compensation on iOS

**Solutions**:
1. Don't use both `KeyboardAvoidingView` and our components
2. Use `avoidKeyboard={false}` on one of them
3. Check `safeArea` setting matches your layout

### Issue: Animations Are Janky

**Solutions**:
1. Set `enableNativeDriver: true` (if compatible with your transforms)
2. Reduce animation duration
3. Ensure component keys are stable across re-renders

---

## Platform-Specific Notes

### iOS

- Uses `keyboardWillShow` / `keyboardWillHide` for smooth animations
- Safe area (home bar) automatically subtracted when `safeArea={true}`
- Recommended: `behavior='padding'` for most cases

### Android

- Uses `keyboardDidShow` / `keyboardDidHide` (events fire after animation)
- May need `android:windowSoftInputMode="adjustResize"` in AndroidManifest
- Recommended: `behavior='position'` for smoother feel

### Web

- Uses window resize events
- Keyboard events may not be available in all browsers
- Recommended: `behavior='padding'` for best compatibility

---

## Performance Considerations

1. **Native Animations**: Use `useNativeDriver: true` where compatible
2. **Memory**: Unregister fields on unmount
3. **Layout**: Avoid complex layouts inside containers
4. **Re-renders**: Use `useMemo` for animated styles

---

## Example: Complete Registration Screen

```typescript
import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Button,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useKeyboardAvoidance } from '../hooks/useKeyboardAvoidance';
import { KeyboardAvoidingContainer } from '../components/KeyboardAvoidance';
import { KeyboardAwareInputWrapper } from '../components/KeyboardAvoidance';

export function RegistrationScreen() {
  const { isVisible, height, animatedValue } = useKeyboardAvoidance({
    bottomOffset: 80,
    safeAreaEnabled: Platform.OS === 'ios',
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Registration logic
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingContainer offset={80} safeArea={true}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Text style={styles.title}>Create Account</Text>
          
          <KeyboardAwareInputWrapper fieldId="email">
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => console.log('Email focused')}
            />
          </KeyboardAwareInputWrapper>

          <KeyboardAwareInputWrapper fieldId="password">
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
              onFocus={() => console.log('Password focused')}
            />
          </KeyboardAwareInputWrapper>

          <KeyboardAwareInputWrapper fieldId="confirm-password">
            <TextInput
              placeholder="Confirm Password"
              style={styles.input}
              secureTextEntry
              onFocus={() => console.log('Confirm focused')}
            />
          </KeyboardAwareInputWrapper>

          <Button title="Register" onPress={handleSubmit} disabled={loading} />
          
          {loading && <ActivityIndicator size="small" color="#3b82f6" />}
        </View>
      </ScrollView>
    </KeyboardAvoidingContainer>
  );
}
```

---

## Support

For issues or questions:
1. Check this guide first
2. Review platform-specific notes
3. Check console logs for keyboard events
4. Verify AndroidManifest configuration

---

**Last Updated**: September 28, 2026  
**Version**: 1.0.0  
**Issue**: #798  
**Status**: ✅ Complete and Ready for Production