/**
 * websocket-interaction.ts — Issue #559
 * WebSocket message type definitions for fluid interactive capabilities
 *
 * Types for:
 *  - Cursor synchronization
 *  - Stroke/drawing synchronization
 *  - State synchronization
 *  - User presence events
 *  - Connection management
 */

// ─── Message Type Definitions ──────────────────────────────────────────────────

export type WebSocketInteractionType =
  // Cursor events
  | 'cursor:moved'
  | 'cursor:visible'
  | 'cursor:hidden'
  
  // Stroke/drawing events
  | 'stroke:started'
  | 'stroke:added'
  | 'stroke:completed'
  | 'stroke:cancelled'
  
  // State synchronization
  | 'state:sync'
  | 'state:delta'
  | 'state:ack'
  
  // User presence
  | 'user:joined'
  | 'user:left'
  | 'user:updated'
  | 'user:ping'
  | 'user:pong'
  
  // Connection management
  | 'connection:status'
  | 'connection:ack'
  | 'connection:reconnect'
  | 'connection:hello'
  | 'connection:hello:ack'
  
  // Canvas-specific
  | 'canvas:zoom'
  | 'canvas:pan'
  | 'canvas:reset'
  
  // Multiplayer game events (if needed)
  | 'game:action'
  | 'game:state'
  | 'game:turn'
  | 'game:result';

// ─── Base Message Interface ────────────────────────────────────────────────────

export interface WebSocketInteractionMessage<T = unknown> {
  type: WebSocketInteractionType;
  payload: T;
  timestamp: number;
  senderId?: string;
  senderName?: string;
  roomId?: string;
  messageId?: string;
}

// ─── Cursor Message Types ──────────────────────────────────────────────────────

export interface CursorMovedPayload {
  x: number;
  y: number;
  color?: string;
  displayName?: string;
  opacity?: number;
  size?: number;
  pressure?: number;
}

export interface CursorVisiblePayload {
  visible: boolean;
  cursorId?: string;
}

export interface CursorHiddenPayload {
  cursorId?: string;
  reason?: 'timeout' | 'user_action' | 'error';
}

// ─── Stroke Message Types ──────────────────────────────────────────────────────

export interface StrokeStartedPayload {
  strokeId: string;
  color: string;
  userId: string;
  points: Point[];
  strokeWidth?: number;
  opacity?: number;
  tool?: 'pen' | 'marker' | 'highlighter' | 'eraser';
  eraserSize?: number;
}

export interface StrokeAddedPayload {
  strokeId: string;
  point: Point;
  pressure?: number;
}

export interface StrokeCompletedPayload {
  strokeId: string;
  points: Point[];
  closed?: boolean;
  timestamp: number;
}

export interface StrokeCancelledPayload {
  strokeId: string;
  reason?: 'user_action' | 'error' | 'timeout';
}

// ─── State Synchronization Types ───────────────────────────────────────────────

export interface StateSyncPayload {
  syncType: 'full' | 'incremental' | 'delta';
  roomId: string;
  state?: CanvasState;
  timestamp: number;
  version?: number;
  senderId?: string;
}

export interface StateDeltaPayload {
  roomId: string;
  changes: CanvasStateDelta;
  timestamp: number;
  version: number;
  senderId?: string;
}

export interface StateAckPayload {
  roomId: string;
  acknowledgedVersion: number;
  timestamp: number;
}

// ─── Canvas State Types ────────────────────────────────────────────────────────

export interface CanvasState {
  paths: Record<string, VectorPath>;
  cursors: Record<string, CollaboratorCursor>;
  viewport?: ViewportState;
  version: number;
  timestamp: number;
}

export interface CanvasStateDelta {
  paths?: Partial<Record<string, VectorPath>>;
  cursors?: Partial<Record<string, CollaboratorCursor>>;
  viewport?: Partial<ViewportState>;
  version?: number;
  removedPaths?: string[];
  removedCursors?: string[];
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

// ─── User Presence Types ───────────────────────────────────────────────────────

export interface UserJoinedPayload {
  userId: string;
  username: string;
  color?: string;
  avatarUrl?: string;
  capabilities?: string[];
  cursorPosition?: Point;
}

export interface UserLeftPayload {
  userId: string;
  reason?: 'disconnect' | 'timeout' | 'user_action' | 'error';
  timestamp: number;
}

export interface UserUpdatedPayload {
  userId: string;
  username?: string;
  color?: string;
  avatarUrl?: string;
  cursorPosition?: Point;
  lastSeen: number;
}

export interface UserPingPayload {
  userId: string;
  timestamp: number;
}

export interface UserPongPayload {
  userId: string;
  timestamp: number;
  rtt?: number; // Round-trip time in ms
}

// ─── Connection Management Types ───────────────────────────────────────────────

export interface ConnectionStatusPayload {
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  roomId?: string;
  retryCount?: number;
  maxRetries?: number;
  lastError?: string;
}

export interface ConnectionReconnectPayload {
  roomId?: string;
  retryAfter?: number;
  suggestedRetry?: number;
}

export interface ConnectionHelloPayload {
  userId: string;
  username: string;
  roomId: string;
  protocolVersion: string;
  capabilities: string[];
  reconnectId?: string;
}

export interface ConnectionHelloAckPayload {
  roomId: string;
  userId: string;
  sessionId: string;
  protocolVersion: string;
  serverTime: number;
}

// ─── Canvas Specific Types ─────────────────────────────────────────────────────

export interface CanvasZoomPayload {
  zoom: number;
  centerX?: number;
  centerY?: number;
  animated?: boolean;
  duration?: number;
}

export interface CanvasPanPayload {
  x: number;
  y: number;
  animated?: boolean;
  duration?: number;
}

export interface CanvasResetPayload {
  animate?: boolean;
  duration?: number;
}

// ─── Game Message Types (Optional) ─────────────────────────────────────────────

export interface GameActionPayload {
  action: 'move' | 'attack' | 'defend' | 'use_item' | 'skip' | 'chat';
  target?: string;
  data?: unknown;
  timestamp: number;
}

export interface GameStatePayload {
  roomId: string;
  turn: number;
  players: GamePlayerState[];
  gameStatus: 'waiting' | 'active' | 'paused' | 'finished';
  timestamp: number;
}

export interface GamePlayerState {
  userId: string;
  username: string;
  position?: Point;
  health?: number;
  score?: number;
  ready: boolean;
}

export interface GameTurnPayload {
  roomId: string;
  turn: number;
  currentPlayerId: string;
  timestamp: number;
}

export interface GameResultPayload {
  roomId: string;
  winnerId?: string;
  scores: Record<string, number>;
  timestamp: number;
}

// ─── Utility Types ─────────────────────────────────────────────────────────────

export interface MessageQueueItem {
  message: WebSocketInteractionMessage;
  priority: MessagePriority;
  retries: number;
  createdAt: number;
  expiresAt: number;
}

export enum MessagePriority {
  Critical = 0,
  High = 1,
  Normal = 2,
  Low = 3,
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  autoConnect?: boolean;
  timeout?: number;
}

export interface CursorConfig {
  visible: boolean;
  opacity: number;
  size: number;
  color: string;
  trailLength: number;
}

export interface CanvasConfig {
  maxPointsPerStroke: number;
  maxStrokes: number;
  pointSpacing: number;
  interpolationEnabled: boolean;
  debounceMs: number;
}

// ─── Type Guards ───────────────────────────────────────────────────────────────

export function isCursorMessage<T = unknown>(
  message: WebSocketInteractionMessage<T>
): message is WebSocketInteractionMessage<CursorMovedPayload | CursorVisiblePayload | CursorHiddenPayload> {
  return (
    message.type === 'cursor:moved' ||
    message.type === 'cursor:visible' ||
    message.type === 'cursor:hidden'
  );
}

export function isStrokeMessage<T = unknown>(
  message: WebSocketInteractionMessage<T>
): message is WebSocketInteractionMessage<StrokeStartedPayload | StrokeAddedPayload | StrokeCompletedPayload | StrokeCancelledPayload> {
  return (
    message.type === 'stroke:started' ||
    message.type === 'stroke:added' ||
    message.type === 'stroke:completed' ||
    message.type === 'stroke:cancelled'
  );
}

export function isUserMessage<T = unknown>(
  message: WebSocketInteractionMessage<T>
): message is WebSocketInteractionMessage<UserJoinedPayload | UserLeftPayload | UserUpdatedPayload | UserPingPayload | UserPongPayload> {
  return (
    message.type === 'user:joined' ||
    message.type === 'user:left' ||
    message.type === 'user:updated' ||
    message.type === 'user:ping' ||
    message.type === 'user:pong'
  );
}

export function isConnectionMessage<T = unknown>(
  message: WebSocketInteractionMessage<T>
): message is WebSocketInteractionMessage<ConnectionStatusPayload | ConnectionReconnectPayload | ConnectionHelloPayload | ConnectionHelloAckPayload> {
  return (
    message.type === 'connection:status' ||
    message.type === 'connection:ack' ||
    message.type === 'connection:reconnect' ||
    message.type === 'connection:hello' ||
    message.type === 'connection:hello:ack'
  );
}

export function isCanvasMessage<T = unknown>(
  message: WebSocketInteractionMessage<T>
): message is WebSocketInteractionMessage<CanvasZoomPayload | CanvasPanPayload | CanvasResetPayload> {
  return (
    message.type === 'canvas:zoom' ||
    message.type === 'canvas:pan' ||
    message.type === 'canvas:reset'
  );
}

// ─── Validation Functions ──────────────────────────────────────────────────────

export function validateCursorPayload(payload: unknown): payload is CursorMovedPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  
  const p = payload as CursorMovedPayload;
  return (
    typeof p.x === 'number' &&
    typeof p.y === 'number' &&
    (p.color === undefined || typeof p.color === 'string') &&
    (p.displayName === undefined || typeof p.displayName === 'string') &&
    (p.opacity === undefined || (typeof p.opacity === 'number' && p.opacity >= 0 && p.opacity <= 1)) &&
    (p.size === undefined || typeof p.size === 'number') &&
    (p.pressure === undefined || (typeof p.pressure === 'number' && p.pressure >= 0 && p.pressure <= 1))
  );
}

export function validateStrokeStartedPayload(payload: unknown): payload is StrokeStartedPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  
  const p = payload as StrokeStartedPayload;
  return (
    typeof p.strokeId === 'string' &&
    typeof p.color === 'string' &&
    typeof p.userId === 'string' &&
    Array.isArray(p.points) &&
    (p.strokeWidth === undefined || typeof p.strokeWidth === 'number') &&
    (p.opacity === undefined || (typeof p.opacity === 'number' && p.opacity >= 0 && p.opacity <= 1)) &&
    (p.tool === undefined || ['pen', 'marker', 'highlighter', 'eraser'].includes(p.tool)) &&
    (p.eraserSize === undefined || typeof p.eraserSize === 'number')
  );
}

export function validateCanvasState(state: unknown): state is CanvasState {
  if (typeof state !== 'object' || state === null) return false;
  
  const s = state as CanvasState;
  return (
    typeof s.paths === 'object' &&
    typeof s.cursors === 'object' &&
    (s.viewport === undefined || (
      typeof s.viewport.x === 'number' &&
      typeof s.viewport.y === 'number' &&
      typeof s.viewport.zoom === 'number' &&
      typeof s.viewport.rotation === 'number'
    )) &&
    typeof s.version === 'number' &&
    typeof s.timestamp === 'number'
  );
}