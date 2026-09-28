/**
 * Barrel export for shared, top-level components.
 */
export { GlobalHeader, type GlobalHeaderProps } from './GlobalHeader';
export { SyncStatusIndicator } from './SyncStatusIndicator';
export { Text, type TextProps } from './Text';

// Buttons (#1355)
export {
  NativeButton,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  DangerButton,
  type NativeButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './buttons/NativeButton';
export { ActionButton, type ActionButtonVariant } from './buttons/ActionButton';

// Push Notification Components
export { PushNotificationIcon } from './PushNotification/PushNotificationIcon';
export { NotificationSettingsToggle } from './PushNotification/NotificationSettingsToggle';
export { NotificationCard } from './PushNotification/NotificationCard';
export { AggregatedNotificationGroup } from './PushNotification/AggregatedNotificationGroup';
