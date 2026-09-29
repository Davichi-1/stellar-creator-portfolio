/**
 * layouts/index.ts — barrel export for the standard screen layout primitives.
 *
 * Related: #1351
 */

export {
  ScreenLayout,
  KeyboardScreen,
  SectionHeader,
  ContentCard,
  EmptyScreenState,
  LoadingScreen,
} from "./ScreenLayouts";

export type {
  ScreenLayoutProps,
  KeyboardScreenProps,
  SectionHeaderProps,
  ContentCardProps,
  EmptyScreenStateProps,
  LoadingScreenProps,
} from "./ScreenLayouts";
