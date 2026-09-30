# WebSocket Integration Guide

**Issue #559**: "Integrate specific fluid interactive standard Websocket capabilities comprehensively inside the Expo application natively providing excellent capabilities relative strictly to user expectations explicitly."

This guide covers the comprehensive WebSocket integration for real-time fluid interactions in the Tamgora mobile app.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Usage Examples](#usage-examples)
5. [Performance Optimization](#performance-optimization)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The WebSocket integration provides:

- **Real-time cursor synchronization** for collaborative drawing
- **Stroke/drawing synchronization** with batching for performance
- **User presence** tracking and management
- **Connection state monitoring** with visual feedback
- **Automatic reconnection** with exponential backoff
- **Zero frame drops** through batched UI updates
- **Memory-efficient handling** with circular buffers

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `cursor:moved` | Bi-directional | Cursor position updates |
| `cursor:visible` | Bi-directional | Cursor visibility toggles |
| `cursor:hidden` | Bi-directional | Cursor hidden events |
| `stroke:started` | Bi-directional | New stroke creation |
| `stroke:added` | Bi-directional | New points in stroke |
| `stroke:completed` | Bi-directional | Stroke finished |
| `user:joined` | Server → Client | New user connected |
| `user:left` | Server → Client | User disconnected |
| `state:sync` | Bi-directional | Full state synchronization |
| `connection:status` | Bi-directional | Connection health |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WebSocket Service                        │
│  - Connection management                                    │
│  - Automatic reconnection                                   │
│  - Heartbeat/ping-pong                                      │
│  - Message queuing                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              ConcurrentWebSocketDataBus                     │
│  - Background JSON parsing (Hermes bridge)                  │
│  - Frame-aligned UI commits (16ms)                          │
│  - Priority queue (Critical/Normal/Low)                     │
│  - Back-pressure handling                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              WebSocketCanvas Component                      │
│  - Skia-based rendering (60fps)                             │
│  - Point interpolation                                      │
│  - Cursor overlays                                          │
│  - Accessibility support                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. useWebSocketInteraction Hook

```typescript
import { useWebSocketInteraction } from '../hooks/useWebSocketInteraction';

const {
  connectionState,
  isConnected,
  users,
  sendCursorMove,
  sendStrokeStart,
  sendStrokeAddPoint,
  sendStrokeComplete,
  clearCursor,
  startAutoSync,
  stopAutoSync,
} = useWebSocketInteraction({
  url: 'ws://your-server.com',
  userId: 'user-123',
  username: 'John Doe',
  roomId: 'room-456',
});
```

### 2. WebSocketCanvas Component

```typescript
import { WebSocketCanvas } from '../components/WebSocketCanvas';

<WebSocketCanvas
  roomId="room-456"
  userId="user-123"
  username="John Doe"
  wsUrl="ws://your-server.com"
  showConnectionStatus={true}
  showCursorOverlays={true}
  onCanvasReady={(canvasId) => console.log('Ready:', canvasId)}
  onStrokeComplete={(strokeId) => console.log('Stroke:', strokeId)}
  onUserJoin={(userId, username) => console.log('Joined:', username)}
  onUserLeave={(userId) => console.log('Left:', userId)}
/>
```

### 3. ConnectionStatusIndicator

```typescript
import { ConnectionStatusIndicator } from '../hooks/useWebSocketInteraction';

<ConnectionStatusIndicator
  connectionState={connectionState}
  isConnected={isConnected}
/>
```

### 4. CursorOverlay

```typescript
import { CursorOverlay } from '../hooks/useWebSocketInteraction';

<CursorOverlay
  users={users}
  localUserId={userId}
  containerStyle={styles.cursorOverlay}
/>
```

---

## Usage Examples

### Example 1: Basic Canvas with Real-time Collaboration

```typescript
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useWebSocketInteraction } from '../hooks/useWebSocketInteraction';
import { ConnectionStatusIndicator } from '../hooks/useWebSocketInteraction';

export function CollaborativeCanvas() {
  const {
    connectionState,
    isConnected,
    sendCursorMove,
  } = useWebSocketInteraction({
    url: process.env.EXPO_PUBLIC_WS_URL!,
    userId: 'user-123',
    username: 'Current User',
    roomId: 'room-456',
  });

  const handleCursorMove = useCallback((x: number, y: number) => {
    sendCursorMove(x, y);
  }, [sendCursorMove]);

  return (
    <View style={styles.container}>
      <ConnectionStatusIndicator
        connectionState={connectionState}
        isConnected={isConnected}
      />
      
      <View style={styles.canvasContainer}>
        {/* Your canvas rendering component */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
  },
});
```

### Example 2: Drawing with WebSocket Integration

```typescript
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useWebSocketInteraction } from '../hooks/useWebSocketInteraction';

export function DrawingCanvas() {
  const { sendStrokeStart, sendStrokeAddPoint, sendStrokeComplete } =
    useWebSocketInteraction({
      url: process.env.EXPO_PUBLIC_WS_URL!,
      userId: 'user-123',
      username: 'Artist',
      roomId: 'drawing-room',
    });

  const [activeStrokeId, setActiveStrokeId] = useState<string | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{x: number, y: number}[]>([]);

  const handleTouchStart = useCallback((x: number, y: number) => {
    const strokeId = `stroke_${Date.now()}`;
    setActiveStrokeId(strokeId);
    setCurrentPoints([{x, y}]);
    
    sendStrokeStart(strokeId, '#3b82f6', 'user-123');
  }, [sendStrokeStart]);

  const handleTouchMove = useCallback((x: number, y: number) => {
    if (!activeStrokeId) return;
    
    const newPoint = {x, y};
    setCurrentPoints(prev => [...prev, newPoint]);
    
    sendStrokeAddPoint(activeStrokeId, newPoint);
  }, [activeStrokeId, sendStrokeAddPoint]);

  const handleTouchEnd = useCallback(() => {
    if (!activeStrokeId) return;
    
    sendStrokeComplete(activeStrokeId);
    setActiveStrokeId(null);
    setCurrentPoints([]);
  }, [activeStrokeId, sendStrokeComplete]);

  return (
    <TouchableWithoutFeedback
      onPressIn={(e) => handleTouchStart(e.nativeEvent.locationX, e.nativeEvent.locationY)}
      onPressOut={handleTouchEnd}
      onMoveOut={(e) => handleTouchMove(e.nativeEvent.locationX, e.nativeEvent.locationY)}
    >
      <View style={styles.canvas} />
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
```

### Example 3: Multi-room Collaboration

```typescript
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Button } from 'react-native';
import { getWebSocketConnectionManager } from '../services/WebSocketConnectionManager';

export function MultiRoomManager() {
  const [connections, setConnections] = useState<string[]>([]);
  const manager = getWebSocketConnectionManager();

  useEffect(() => {
    // Connect to multiple rooms
    const room1Id = manager.connect('room-1', 'ws://server.com/ws');
    const room2Id = manager.connect('room-2', 'ws://server.com/ws');
    
    setConnections([room1Id, room2Id]);

    // Cleanup on unmount
    return () => {
      manager.disconnect(room1Id);
      manager.disconnect(room2Id);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Button title="Send to Room 1" onPress={() => {
        manager.send(connections[0], 'message', { text: 'Hello Room 1' });
      }} />
      <Button title="Send to Room 2" onPress={() => {
        manager.send(connections[1], 'message', { text: 'Hello Room 2' });
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});
```

---

## Performance Optimization

### 1. Frame-Optimized Updates

The integration uses 16ms batch updates for 60fps rendering:

```typescript
// Automatic batching (built-in)
sendCursorMove(x, y); // Updates batched, sent at 60fps
```

### 2. Memory-Efficient Canvas

Use `OptimizedCanvas` for memory-constrained scenarios:

```typescript
import { OptimizedCanvas } from '../components/WebSocketCanvas';

<OptimizedCanvas
  roomId="room-456"
  userId="user-123"
  maxStrokes={100} // Limit stored strokes
  frameBudgetMs={16} // 60fps target
/>
```

### 3. Stroke History Buffer

```typescript
import { StrokeHistoryBuffer } from '../hooks/useWebSocketInteraction';

const strokeHistory = new StrokeHistoryBuffer(1000); // Max 1000 strokes

// Add stroke
strokeHistory.add(stroke);

// Get all strokes
const allStrokes = strokeHistory.all;

// Clear history
strokeHistory.clear();
```

### 4. Cursor Position Throttling

```typescript
import { useFrameOptimizedCursor } from '../hooks/useWebSocketInteraction';

const sendCursor = useFrameOptimizedCursor(
  (x, y) => sendCursorMove(x, y),
  { debounceMs: 16, maxUpdatesPerSecond: 60 }
);
```

---

## Best Practices

### 1. Connection Management

- Always use `useWebSocketInteraction` hook in components
- Clean up connections on unmount
- Handle reconnection gracefully

```typescript
useEffect(() => {
  const { disconnect } = useWebSocketInteraction({ url, userId, roomId });
  
  return () => {
    disconnect();
  };
}, [url, userId, roomId]);
```

### 2. Message Handling

- Use type-safe message handlers
- Implement proper error handling
- Handle duplicate messages

```typescript
onMessage('cursor:moved', (msg) => {
  if (!validateCursorPayload(msg.payload)) {
    console.error('Invalid cursor payload');
    return;
  }
  // Process message
});
```

### 3. Rendering Performance

- Use `OptimizedCanvas` for long sessions
- Limit `maxStrokes` in memory-constrained scenarios
- Use `strokeHistory.clear()` periodically

### 4. User Experience

- Show connection status
- Display cursor overlays for collaboration
- Provide visual feedback for actions

```typescript
{!isConnected && <ConnectionStatusIndicator connectionState={connectionState} isConnected={isConnected} />}
<CursorOverlay users={users} localUserId={userId} />
```

---

## Troubleshooting

### Connection Issues

**Problem**: WebSocket connection fails to establish

**Solutions**:
1. Check server URL is correct
2. Verify server supports WebSocket protocol
3. Check network connectivity
4. Verify CORS configuration (web)

### Reconnection Problems

**Problem**: Connection keeps dropping and failing to reconnect

**Solutions**:
1. Check `maxReconnectAttempts` configuration
2. Verify `reconnectInterval` is appropriate
3. Check server stability
4. Implement exponential backoff manually if needed

### Performance Issues

**Problem**: Frame drops during rendering

**Solutions**:
1. Use `OptimizedCanvas` instead of default canvas
2. Reduce `maxStrokes` limit
3. Increase `frameBudgetMs` (e.g., 33ms = 30fps)
4. Clear stroke history periodically

### Message Ordering

**Problem**: Messages arrive out of order

**Solutions**:
1. Messages are processed in order (WebSocket guarantees this)
2. Check timestamp fields for synchronization
3. Implement client-side timestamp-based ordering if needed

---

## API Reference

### useWebSocketInteraction

| Property | Type | Description |
|----------|------|-------------|
| `connectionState` | `ConnectionState` | Current connection state |
| `isConnected` | `boolean` | Connection status |
| `users` | `Record<string, CursorState>` | Active users and their cursors |
| `sendCursorMove(x, y)` | `void` | Send cursor position |
| `sendStrokeStart(...)` | `void` | Start new stroke |
| `sendStrokeAddPoint(...)` | `void` | Add point to stroke |
| `sendStrokeComplete(...)` | `void` | Complete stroke |
| `clearCursor(userId)` | `void` | Clear cursor for user |
| `startAutoSync()` | `void` | Start state sync |
| `stopAutoSync()` | `void` | Stop state sync |

### WebSocketCanvas Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `roomId` | `string` | Required | Room identifier |
| `userId` | `string` | Required | User identifier |
| `username` | `string` | `'User'` | Display name |
| `wsUrl` | `string` | `EXPO_PUBLIC_WS_URL` | WebSocket URL |
| `containerStyle` | `ViewStyle` | `{}` | Container styling |
| `showConnectionStatus` | `boolean` | `true` | Show status indicator |
| `showCursorOverlays` | `boolean` | `true` | Show cursor overlays |
| `onCanvasReady` | `(id: string) => void` | - | Canvas ready callback |
| `onStrokeComplete` | `(id: string) => void` | - | Stroke complete callback |
| `onUserJoin` | `(id, name) => void` | - | User joined callback |
| `onUserLeave` | `(id) => void` | - | User left callback |

---

## Example Projects

### Complete Drawing App

See `mobile/src/screens/WebSocketDrawingScreen.tsx` for a complete implementation with:

- Collaborative drawing
- Multiple users
- Color selection
- Stroke tools
- Connection monitoring
- Performance optimization

### Real-time Chat

See `mobile/src/screens/MessagingScreen.tsx` for WebSocket-based messaging.

---

## Migration Guide

### From HTTP Polling to WebSocket

**Before** (HTTP Polling):
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch('/api/messages');
    const data = await response.json();
    setMessages(data.messages);
  }, 3000);
  
  return () => clearInterval(interval);
}, []);
```

**After** (WebSocket):
```typescript
const { onMessage } = useWebSocketInteraction({ url, userId, roomId });

useEffect(() => {
  const unsubscribe = onMessage('chat:message', (msg) => {
    setMessages(prev => [...prev, msg.payload]);
  });
  
  return () => unsubscribe();
}, [onMessage]);
```

---

## Support

For issues or questions:
1. Check this guide first
2. Review example implementations
3. Check connection logs for debugging
4. Verify server WebSocket implementation

---

**Last Updated**: September 28, 2026
**Version**: 1.0.0
**Issue**: #559