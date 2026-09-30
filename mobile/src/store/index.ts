/**
 * Single import surface for all Zustand stores and their types.
 *
 * Issue #1352 — "Initialize Mobile State Management with Zustand":
 * Added bounty, profile, and notification store exports.
 */
export { useAuthStore, AUTH_STORAGE_KEY } from './authStore';
export { useUIStore } from './uiStore';
export { useBountyStore, BOUNTY_STORAGE_KEY } from './bountyStore';
export { useProfileStore, PROFILE_STORAGE_KEY } from './profileStore';
export { useNotificationStore, NOTIFICATION_STORAGE_KEY } from './notificationStore';
export { useMultiSigStore } from './multiSigStore';
export type {
  AuthState,
  UIState,
  User,
  // Bounty
  BountyState,
  Bounty,
  BountyFilters,
  BountyStatus,
  // Profile
  ProfileState,
  CreatorProfile,
  PortfolioProject,
  // Notifications
  NotificationState,
  InAppNotification,
  InAppNotificationKind,
  // Shared
  NotificationPermission,
} from './types';
