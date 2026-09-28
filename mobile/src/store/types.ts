/**
 * Shared type definitions for the Zustand stores.
 *
 * All store state/action shapes live here so store files contain no inline
 * type definitions.
 *
 * Issue #1352 — "Initialize Mobile State Management with Zustand":
 * Added `BountyState`, `ProfileState`, and `NotificationState` covering the
 * bounty marketplace, user profile, and in-app notification domains.
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Authenticated user profile persisted alongside the session token. */
export interface User {
  /** Stable unique identifier. */
  id: string;
  /** Account email address. */
  email: string;
  /** Optional human-readable display name. */
  displayName?: string;
  /** Optional avatar image URL. */
  avatarUrl?: string;
  /** Optional discipline / role label (e.g. "UI/UX Designer"). */
  discipline?: string;
}

/** Authentication store state + actions. */
export interface AuthState {
  /** Current user, or `null` when signed out. */
  user: User | null;
  /** Current session token, or `null` when signed out. */
  token: string | null;
  /** Whether a user is currently authenticated. */
  isAuthenticated: boolean;
  /**
   * Whether the persisted store has finished rehydrating from storage.
   * Gate auth-dependent rendering on this to avoid a flash of the wrong screen.
   */
  isHydrated: boolean;
  /** Persist the signed-in user and token, marking the session authenticated. */
  setUser: (user: User, token: string) => void;
  /** Clear the user, token, and authenticated flag. */
  clearAuth: () => void;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

/** Notification permission states mirroring expo-notifications PermissionStatus. */
export type NotificationPermission = 'undetermined' | 'granted' | 'denied';

/** Global UI store state + actions (in-memory only, never persisted). */
export interface UIState {
  /** Whether a global blocking loader should be shown. */
  isLoading: boolean;
  /** Current toast message, or `null` when no toast is visible. */
  toastMessage: string | null;
  /** Toggle the global loading flag. */
  setLoading: (value: boolean) => void;
  /** Show a toast with the given message. */
  showToast: (message: string) => void;
  /** Dismiss the current toast. */
  clearToast: () => void;
  /** Currently playing audio track metadata. */
  currentTrack: { title: string; creator: string; artworkUrl?: string } | null;
  /** Whether audio is currently playing. */
  isAudioPlaying: boolean;
  /** Set current track and playing state. */
  setCurrentTrack: (track: { title: string; creator: string; artworkUrl?: string } | null) => void;
  /** Set audio playing state. */
  setAudioPlaying: (isPlaying: boolean) => void;
  /** Push notification permission state. */
  notificationPermission: NotificationPermission;
  /** Update the stored notification permission state. */
  setNotificationPermission: (permission: NotificationPermission) => void;
}

// ─── Bounty ───────────────────────────────────────────────────────────────────

/** Lifecycle stages of a bounty. */
export type BountyStatus =
  | 'open'
  | 'in_progress'
  | 'under_review'
  | 'completed'
  | 'cancelled'
  | 'disputed';

/** A single bounty posted on the marketplace. */
export interface Bounty {
  id: string;
  title: string;
  description: string;
  /** Budget in XLM. */
  budgetXlm: number;
  /** ISO-8601 deadline, or `null` if open-ended. */
  deadline: string | null;
  status: BountyStatus;
  /** Discipline tags (e.g. ["UI/UX Design", "Branding"]). */
  disciplines: string[];
  /** Client user ID. */
  clientId: string;
  /** Escrow contract address, present once funded. */
  contractAddress?: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}

/** Filter parameters for the bounty list. */
export interface BountyFilters {
  status?: BountyStatus;
  discipline?: string;
  minBudget?: number;
  maxBudget?: number;
  searchQuery?: string;
}

/** Bounty store state + actions. */
export interface BountyState {
  /** Ordered list of bounties in the current view. */
  bounties: Bounty[];
  /** The single bounty loaded in a detail view, or `null`. */
  selectedBounty: Bounty | null;
  /** Active list filters. */
  filters: BountyFilters;
  /** Whether a network fetch is in flight. */
  isLoading: boolean;
  /** Last fetch error message, or `null`. */
  error: string | null;
  /** ISO-8601 timestamp of the last successful fetch, or `null`. */
  lastFetchedAt: string | null;

  // Actions
  /** Replace the full bounty list (e.g. after a network fetch). */
  setBounties: (bounties: Bounty[]) => void;
  /** Upsert a single bounty into the list by ID. */
  upsertBounty: (bounty: Bounty) => void;
  /** Remove a bounty from the list by ID. */
  removeBounty: (id: string) => void;
  /** Set the bounty displayed in the detail view. */
  selectBounty: (bounty: Bounty | null) => void;
  /** Update filter state (partial merge). */
  setFilters: (filters: Partial<BountyFilters>) => void;
  /** Reset filters to their initial values. */
  clearFilters: () => void;
  /** Toggle the loading flag. */
  setLoading: (value: boolean) => void;
  /** Set or clear the error message. */
  setError: (error: string | null) => void;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

/** A portfolio project item. */
export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  /** Remote image URL for the project thumbnail. */
  thumbnailUrl?: string;
  /** Tags / skills demonstrated. */
  tags: string[];
  /** URL to the live project or case study. */
  projectUrl?: string;
  /** ISO-8601 completion date. */
  completedAt?: string;
}

/** A creator's public profile. */
export interface CreatorProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  discipline: string;
  bio: string;
  location?: string;
  websiteUrl?: string;
  /** Stellar wallet address. */
  walletAddress?: string;
  portfolioProjects: PortfolioProject[];
  /** Aggregate rating (0–5). */
  rating: number;
  /** Number of completed bounties. */
  completedBounties: number;
  /** Social links keyed by platform slug (e.g. `{ twitter: "…", linkedin: "…" }`). */
  socialLinks: Record<string, string>;
  /** ISO-8601 join date. */
  joinedAt: string;
}

/** Profile store state + actions. */
export interface ProfileState {
  /** The signed-in user's own profile, or `null` before loaded. */
  ownProfile: CreatorProfile | null;
  /** Cache of viewed profiles keyed by userId. */
  profileCache: Record<string, CreatorProfile>;
  /** Whether the own-profile fetch is in flight. */
  isLoading: boolean;
  /** Whether the own-profile is being saved. */
  isSaving: boolean;
  /** Last fetch/save error, or `null`. */
  error: string | null;

  // Actions
  /** Replace the signed-in user's profile data. */
  setOwnProfile: (profile: CreatorProfile) => void;
  /** Apply a partial update to the own profile (optimistic UI). */
  patchOwnProfile: (patch: Partial<Omit<CreatorProfile, 'userId'>>) => void;
  /** Add or replace a profile in the cache. */
  cacheProfile: (profile: CreatorProfile) => void;
  /** Retrieve a cached profile by userId, or `undefined` if not cached. */
  getCachedProfile: (userId: string) => CreatorProfile | undefined;
  /** Upsert a portfolio project in the own profile. */
  upsertProject: (project: PortfolioProject) => void;
  /** Remove a portfolio project from the own profile. */
  removeProject: (projectId: string) => void;
  /** Toggle the loading flag. */
  setLoading: (value: boolean) => void;
  /** Toggle the saving flag. */
  setSaving: (value: boolean) => void;
  /** Set or clear the error message. */
  setError: (error: string | null) => void;
}

// ─── In-app Notifications ─────────────────────────────────────────────────────

export type InAppNotificationKind =
  | 'bounty_match'
  | 'bounty_applied'
  | 'application_accepted'
  | 'milestone_released'
  | 'payment_received'
  | 'new_message'
  | 'review_received'
  | 'dispute_opened'
  | 'system';

/** A single in-app notification entry. */
export interface InAppNotification {
  id: string;
  kind: InAppNotificationKind;
  title: string;
  body: string;
  /** Whether the user has tapped/seen the notification. */
  read: boolean;
  /**
   * Deep-link route to navigate to on tap
   * (e.g. `"/(app)/bounty/abc123"`).
   */
  route?: string;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

/** In-app notification store state + actions. */
export interface NotificationState {
  /** Ordered list of notifications (newest first). */
  notifications: InAppNotification[];
  /** Count of unread notifications (derived, kept in sync by actions). */
  unreadCount: number;
  /** Whether a fetch is in flight. */
  isLoading: boolean;

  // Actions
  /** Prepend one or more new notifications (from push or polling). */
  addNotifications: (items: InAppNotification[]) => void;
  /** Mark a single notification as read by ID. */
  markRead: (id: string) => void;
  /** Mark all notifications as read. */
  markAllRead: () => void;
  /** Remove a notification by ID. */
  dismiss: (id: string) => void;
  /** Clear the entire notification list. */
  clearAll: () => void;
  /** Toggle the loading flag. */
  setLoading: (value: boolean) => void;
}
