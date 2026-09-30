import { useCallback, useEffect, useRef, useState } from 'react';

// Strict interfaces for WebSocket events
interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
}

interface ConnectionEvent {
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
}

interface BountyUpdate {
  id: string;
  title: string;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
  applicants: number;
  updatedAt: string;
}

interface CreatorUpdate {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  updatedAt: string;
}

interface ApplicationUpdate {
  id: string;
  bountyId: string;
  creatorId: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
}

type WebSocketEventType = BountyUpdate | CreatorUpdate | ApplicationUpdate;

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage<WebSocketEventType>) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (event: ConnectionEvent) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Custom React hook for managing WebSocket connections with automatic reconnection and lifecycle handling.
 *
 * Key capabilities:
 * - Automatically connects to the provided WebSocket URL and cleans up on unmount
 * - Handles reconnection with configurable attempt counts and backoff delay
 * - Parses incoming messages and dispatches errors when parsing fails
 * - Tracks connection state (`isConnected`) and notifies on connection transitions
 * - Provides a safe `send` method that validates socket readiness
 * - Provides a manual `disconnect` method that prevents zombie reconnect loops
 *
 * @param options - Configuration options for the WebSocket connection
 * @param options.url - The WebSocket server endpoint URL
 * @param options.onMessage - Optional callback invoked when a parsed message is received
 * @param options.onError - Optional callback invoked on connection or message parsing error
 * @param options.onConnectionChange - Optional callback invoked on connection state transitions
 * @param options.reconnectAttempts - Maximum number of reconnection attempts before giving up (default: 5)
 * @param options.reconnectDelay - Delay in milliseconds between reconnection attempts (default: 3000)
 * @returns An object containing `isConnected` status, `send` function to transmit messages, and `disconnect` function
 */
export function useWebSocket({
  url,
  onMessage,
  onError,
  onConnectionChange,
  reconnectAttempts = 5,
  reconnectDelay = 3000,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intentionalCloseRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs so connect() doesn't need to depend on them
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onConnectionChangeRef = useRef(onConnectionChange);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onConnectionChangeRef.current = onConnectionChange;
  }, [onMessage, onError, onConnectionChange]);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectCountRef.current = 0;
        onConnectionChangeRef.current?.({
          status: 'connected',
          message: 'WebSocket connected',
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage<WebSocketEventType> = JSON.parse(event.data);
          onMessageRef.current?.(message);
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Failed to parse message');
          onErrorRef.current?.(error);
        }
      };

      ws.onerror = () => {
        const error = new Error('WebSocket error occurred');
        onErrorRef.current?.(error);
        onConnectionChangeRef.current?.({
          status: 'error',
          message: error.message,
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        onConnectionChangeRef.current?.({
          status: 'disconnected',
          message: 'WebSocket disconnected',
        });

        // Skip reconnect if the close was intentional (e.g. component unmount
        // or an explicit disconnect() call) to avoid zombie connections.
        if (intentionalCloseRef.current) {
          return;
        }

        // Attempt reconnection
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect');
      onErrorRef.current?.(error);
    }
  }, [url, reconnectAttempts, reconnectDelay]);

  const send = useCallback(
    (message: WebSocketMessage<WebSocketEventType>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      } else {
        const error = new Error('WebSocket is not connected');
        onErrorRef.current?.(error);
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    // Mark as intentional so the onclose handler skips the reconnect branch.
    intentionalCloseRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    send,
    disconnect,
  };
}
