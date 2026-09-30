// ─── Theme Types ──────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

// ─── Preference Types ─────────────────────────────────────────────────────────

export type NotificationLevel = 'none' | 'critical' | 'important' | 'all';

export type DataUsageMode = 'standard' | 'low' | 'economy';

export interface UserPreferences {
  // Appearance
  themeMode: ThemeMode;
  
  // Notifications
  notificationEnabled: boolean;
  notificationLevel: NotificationLevel;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  
  // Data & Storage
  dataUsageMode: DataUsageMode;
  autoDownloadMedia: boolean;
  cacheClearOnExit: boolean;
  
  // Privacy
  profileVisibleToPublic: boolean;
  showLastSeen: boolean;
  allowScreenRecording: boolean;
  
  // Accessibility
  largerTextEnabled: boolean;
  highContrastEnabled: boolean;
  
  // Features
  biometricAuthEnabled: boolean;
  darkModeAutoSwitch: boolean;
}

// ─── Preference Category Types ────────────────────────────────────────────────

export type PreferenceCategory = 
  | 'appearance'
  | 'notifications'
  | 'privacy'
  | 'data'
  | 'accessibility'
  | 'account'
  | 'about';

export interface PreferenceOption<T = string | boolean | number> {
  key: string;
  label: string;
  description?: string;
  value: T;
  type: 'switch' | 'picker' | 'slider' | 'action';
  options?: Array<{ value: T; label: string; description?: string }>;
  min?: number;
  max?: number;
  step?: number;
}

// ─── Navigation Types ──────────────────────────────────────────────────────────

export type RootStackParamList = {
  MainTabs: undefined;
  Dashboard: undefined;
  FocusTimer: undefined;
  DetailsView: undefined;
  LanguageSettings: undefined;
  PortfolioUpload: undefined;
  CreatorProfile: { creatorId: string };
  FreelancerDirectory: undefined;
  FreelancerProfile: { creatorId: string };
  ImagePicker: { maxImages?: number };
  ImageEditor: { imageUri: string; imageWidth?: number; imageHeight?: number; fileSize?: number; mode?: string };
  Messaging: { conversationId?: string; recipientName?: string };
  BiometricAuth: undefined;
  StreamHost: { roomId: string; signalingServerUrl?: string };
  StreamViewer: { roomId: string; creatorName?: string; signalingServerUrl?: string };
  NotificationSettings: undefined;
  Preferences: undefined;
  BountyDetail: { bountyId: string };
  EmailVerification: { token?: string };
  PaymentComplete: { paymentId?: string; status?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Activity: undefined;
  Dashboard: undefined;
  Profile: undefined;
  Settings: undefined;
};

// ─── Settings Stack Param List ────────────────────────────────────────────────

export type SettingsStackParamList = {
  Settings: undefined;
  LanguageSettings: undefined;
  ThemeSettings: undefined;
  NotificationSettings: undefined;
  Preferences: undefined;
};

// ─── Home Screen ──────────────────────────────────────────────────────────────

export interface PortfolioSummary {
  id: string;
  title: string;
  subtitle: string;
  creator: string;
  value: string;
  followers: number;
  change: number;
  tags: string[];
}

export interface MetricCard {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  trendPct: number;
}

export interface ProjectBountyItem {
  id: string;
  kind: 'project' | 'bounty';
  title: string;
  subtitle: string;
  reward: string;
  due: string;
  status: string;
  tags: string[];
}

export interface HomeData {
  trendingPortfolios: PortfolioSummary[];
  quickMetrics: MetricCard[];
  projectBountyItems: ProjectBountyItem[];
}

// ─── Canvas / Collaboration ───────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface VectorPath {
  id: string;
  userId: string;
  color: string;
  strokeWidth: number;
  points: Point[];
  closed: boolean;
  timestamp: number;
}

export interface CanvasState {
  paths: Record<string, VectorPath>;
  activePath: string | null;
  collaborators: Record<string, CollaboratorCursor>;
}

export interface CollaboratorCursor {
  userId: string;
  displayName: string;
  color: string;
  point: Point;
  lastSeen: number;
}

// ─── Messaging / Encryption ───────────────────────────────────────────────────

export interface KeyBundle {
  identityKey: Uint8Array;
  signedPreKey: { keyId: number; publicKey: Uint8Array; signature: Uint8Array };
  oneTimePreKeys: Array<{ keyId: number; publicKey: Uint8Array }>;
}

export interface EncryptedMessage {
  id: string;
  senderId: string;
  recipientId: string;
  ciphertext: Uint8Array;
  messageType: 1 | 3; // 1 = PreKeyWhisperMessage, 3 = WhisperMessage
  timestamp: number;
}

export interface DecryptedMessage {
  id: string;
  senderId: string;
  body: string;
  timestamp: number;
}

export interface SessionRecord {
  remoteUserId: string;
  sessionData: string; // base64 serialised session
  createdAt: number;
  lastUsed: number;
}

// ─── Sealed Sender ────────────────────────────────────────────────────────────

export interface SealedSenderMessage {
  id: string;
  envelope: Uint8Array;
  signature: Uint8Array;
  messageType: 1 | 3;
  timestamp: number;
}

// ─── Delivery Receipts ───────────────────────────────────────────────────────

export interface DeliveryReceipt {
  messageId: string;
  recipientId: string;
  status: 'delivered' | 'read';
  timestamp: number;
}

// ─── Upscaling ────────────────────────────────────────────────────────────────

export interface UpscaleOptions {
  scaleFactor: 2 | 4;
  tileSize: number;   // pixels — controls peak memory
  overlap: number;    // tile overlap to avoid seams
}

export interface UpscaleResult {
  uri: string;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  processingMs: number;
  peakMemoryMb: number;
}

// ─── Media trimming ───────────────────────────────────────────────────────────

export interface TrimRange {
  startMs: number;
  endMs: number;
}

export interface TrimOptions {
  inputUri: string;
  range: TrimRange;
  outputFormat: 'mp4' | 'mov';
  hardwareEncoding: boolean;
  videoBitrate?: number;  // kbps
  audioBitrate?: number;  // kbps
}

export interface TrimResult {
  outputUri: string;
  durationMs: number;
  fileSizeBytes: number;
  processingMs: number;
}

export interface VideoFrame {
  index: number;
  timestampMs: number;
  uri: string; // thumbnail URI
}

// ─── Focus Timer ──────────────────────────────────────────────────────────────

export interface FocusSession {
  id: string;
  bountyId: string | null;
  phase: 'focus' | 'short-break' | 'long-break';
  durationSeconds: number;
  completedAt: string; // ISO 8601
}

// ─── Offline / Network ────────────────────────────────────────────────────────

export type NetworkState = 'unknown' | 'online' | 'offline';
export type SyncStatus = 'synced' | 'syncing' | 'error';

export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  payload?: Record<string, unknown>;
  retries: number;
  createdAt: string;
  /** Epoch ms — op is not retried until Date.now() >= nextRetryAt */
  nextRetryAt: number;
}

// ─── Multi-Sig Approval ───────────────────────────────────────────────────────

export type MultiSigSignerStatus = 'pending' | 'approved';

export interface MultiSigSigner {
  id: string;
  name: string;
  role: 'Initiator' | 'Approver';
  status: MultiSigSignerStatus;
}

export interface MultiSigTask {
  id: string;
  title: string;
  amount: string;
  description: string;
  status: 'pending' | 'approved';
  signers: MultiSigSigner[];
  /** Signer IDs currently mid-way through a biometric confirmation prompt. */
  queuedApprovals: string[];
}

export interface MultiSigState {
  tasks: MultiSigTask[];
  /**
   * Prompts `signerId` for a real biometric confirmation and only flips
   * their status to 'approved' on success. Throws if the confirmation
   * fails or is cancelled — callers must not assume approval succeeded.
   */
  queueApproval: (taskId: string, signerId: string) => Promise<void>;
  approveSigner: (taskId: string, signerId: string) => void;
}

// ─── Share Payload Types ───────────────────────────────────────────────────────

export type ShareContentType = 'profile' | 'bounty' | 'review' | 'achievement' | 'portfolio' | 'link';

export interface SharePayload {
  type: ShareContentType;
  title: string;
  message?: string;
  url: string;
  imageUrl?: string;
  tags?: string[];
  metadata?: Record<string, string | number | boolean>;
}

export interface ShareOptions {
  dismissable?: boolean;
  showPreview?: boolean;
  showOptions?: boolean;
  defaultAction?: 'share' | 'copy';
  onShare?: (contentType: ShareContentType, url: string) => void;
  onCancel?: () => void;
}

// ─── Share Endpoint Types ──────────────────────────────────────────────────────

export interface ShareEndpoint {
  id: string;
  name: string;
  icon: string;
  type: 'native' | 'web' | 'social' | 'messaging' | 'email';
  supportedContentTypes: ShareContentType[];
  share: (payload: SharePayload) => Promise<void>;
  canShare: (payload: SharePayload) => boolean;
}

export interface SharedContent {
  type: ShareContentType;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  tags?: string[];
}

// ─── Activity Types ────────────────────────────────────────────────────────────

export type ActivityEventType =
  | 'bounty_posted'
  | 'bounty_applied'
  | 'bounty_accepted'
  | 'bounty_rejected'
  | 'bounty_completed'
  | 'review_received'
  | 'review_left'
  | 'payment_received'
  | 'payment_sent'
  | 'message_received'
  | 'profile_viewed'
  | 'match_found'
  | 'dispute_opened'
  | 'dispute_resolved';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  subtitle?: string;
  amount?: number;
  relatedId?: string;
  relatedName?: string;
  avatarUrl?: string;
  read: boolean;
  createdAt: string; // ISO 8601
}

export interface ActivitySummary {
  totalEvents: number;
  unreadCount: number;
  weeklyEarnings: number;
  weeklyBounties: number;
}

export type ActivityFilterType =
  | 'all'
  | 'bounties'
  | 'reviews'
  | 'payments'
  | 'messages'
  | 'applications';
