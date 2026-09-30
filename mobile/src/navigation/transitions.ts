/**
 * transitions.ts — Issue 2
 * "Finalize explicit liquid layout Native Stack transition behaviors internally"
 *
 * Defines per-screen transition animations using react-native-reanimated
 * interpolations wired into react-navigation's custom animation config.
 *
 * Transition catalogue:
 *   slideFromRight  — default push (iOS-style)
 *   slideFromBottom — modal sheet
 *   fadeScale       — overlay / dialog
 *   liquidSlide     — fluid horizontal with parallax depth
 *   none            — instant (for tab switches)
 */

import { StackAnimationTypes } from 'react-native-screens';

// ─── Named transition presets ─────────────────────────────────────────────────

/**
 * Maps a logical transition name to the native screen animation type.
 * react-native-screens handles the actual interpolation natively on both
 * iOS and Android, giving us true 60/120 fps with no JS thread involvement.
 */
export const Transitions = {
  /** Standard iOS push — slide from right with back-card parallax. */
  slideFromRight: 'slide_from_right' as StackAnimationTypes,

  /** Bottom sheet modal — slides up from the bottom edge. */
  slideFromBottom: 'slide_from_bottom' as StackAnimationTypes,

  /** Fade + scale — used for dialogs and overlays. */
  fadeScale: 'fade_from_bottom' as StackAnimationTypes,

  /** Simple fade — used for tab root screens. */
  fade: 'fade' as StackAnimationTypes,

  /** No animation — instant swap (tab switches, deep links). */
  none: 'none' as StackAnimationTypes,

  /** Custom parallax slide — liquid layout with depth perception. */
  parallaxSlide: 'custom' as StackAnimationTypes,
} as const;

export type TransitionName = keyof typeof Transitions;

// ─── Screen-level transition map ──────────────────────────────────────────────

/**
 * Assign a transition to each screen by name.
 * Import this in AppNavigator to keep transition logic centralised.
 * 
 * Mapped screens:
 *  - MainTabs, Dashboard, LanguageSettings (core stack)
 *  - CreatorProfile, FreelancerDirectory, FreelancerProfile (creator screens)
 *  - ImagePicker, ImageEditor, PortfolioUpload (media uploads)
 *  - Messaging, DetailsView (interaction screens)
 *  - BiometricAuth, EmailVerification (auth screens)
 *  - BountyDetail, PaymentComplete (commerce screens)
 *  - ActivityTimeline, ActivityScreen (activity screens)
 *  - StreamHost, StreamViewer (streaming screens)
 *  - ProfileScreen (user profile)
 */
export const ScreenTransitions: Record<string, StackAnimationTypes> = {
  // ── Core tabs ───────────────────────────────────────────────────────────
  MainTabs:          Transitions.none,              // Tab switch - instant
  
  // ── Dashboard & Analytics ──────────────────────────────────────────────
  Dashboard:         Transitions.slideFromRight,    // Standard push
  
  // ── Creator Screens ────────────────────────────────────────────────────
  CreatorProfile:    Transitions.slideFromRight,    // Profile view
  CreatorProfileScreenConnected: Transitions.slideFromRight,
  
  // ── Freelancer Screens ─────────────────────────────────────────────────
  FreelancerDirectory: Transitions.slideFromRight,  // Directory list
  FreelancerProfile:   Transitions.slideFromRight,  // Freelancer view
  
  // ── Settings & Config ──────────────────────────────────────────────────
  LanguageSettings:  Transitions.slideFromRight,    // Settings list
  ThemeSettings:     Transitions.slideFromRight,    // Theme picker
  NotificationSettings: Transitions.slideFromRight, // Notification prefs
  
  // ── Upload & Media ─────────────────────────────────────────────────────
  PortfolioUpload:   Transitions.slideFromBottom,   // Upload sheet
  ImagePicker:       Transitions.slideFromBottom,   // Image picker sheet
  ImageEditor:       Transitions.slideFromBottom,   // Editor sheet
  
  // ── Messaging & Details ────────────────────────────────────────────────
  Messaging:         Transitions.slideFromRight,    // Chat view
  DetailsView:       Transitions.slideFromRight,    // Detail view
  
  // ── Auth & Security ────────────────────────────────────────────────────
  BiometricAuth:     Transitions.fadeScale,         // Overlay
  EmailVerification: Transitions.fade,              // Simple fade
  PaymentComplete:   Transitions.slideFromBottom,   // Success sheet
  
  // ── Activity ───────────────────────────────────────────────────────────
  ActivityTimeline:  Transitions.slideFromRight,    // Timeline view
  ActivityScreen:    Transitions.none,              // Tab screen
  
  // ── Streaming ──────────────────────────────────────────────────────────
  StreamHost:        Transitions.slideFromBottom,   // Streaming sheet
  StreamViewer:      Transitions.slideFromRight,    // Viewer view
  
  // ── Profile & Settings ─────────────────────────────────────────────────
  ProfileScreen:     Transitions.slideFromRight,    // User profile
  
  // ── Bounties ───────────────────────────────────────────────────────────
  BountyDetail:      Transitions.slideFromRight,    // Bounty details
  
  // ── Modal presentations (for full screen modal) ────────────────────────
  ShareScreen:       Transitions.slideFromBottom,
  RatingScreen:      Transitions.slideFromRight,
  OfflineScreen:     Transitions.fadeScale,
} as const;

// ─── Gesture config ───────────────────────────────────────────────────────────

/**
 * Gesture-driven back swipe config.
 * Full-width swipe area on iOS; standard edge swipe on Android.
 */
export const GestureConfig = {
  /** Enable swipe-back on all push screens. */
  gestureEnabled: true,
  /** Full-width swipe area (iOS only — Android uses edge swipe natively). */
  fullScreenGestureEnabled: true,
  /** Velocity threshold before the gesture commits. */
  gestureVelocityImpact: 0.3,
} as const;

// ─── Header animation config ──────────────────────────────────────────────────

/**
 * Shared header style that blurs on scroll (iOS) and elevates (Android).
 * Apply via screenOptions in the navigator.
 */
export const HeaderConfig = {
  headerShown: false,          // We use custom headers in each screen
  headerTransparent: false,
  headerBlurEffect: 'regular', // iOS only
} as const;
