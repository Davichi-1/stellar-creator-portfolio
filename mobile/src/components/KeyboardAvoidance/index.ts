/**
 * Keyboard Avoidance Components Index
 * Issue #798 - "Manage comprehensive exact localized Keyboard avoidance behavioral anomalies precisely"
 */

export { KeyboardAvoidingContainer } from './KeyboardAvoidingContainer';
export { SmartKeyboardAvoidingContainer } from './SmartKeyboardAvoidingContainer';
export { KeyboardAwareInputWrapper } from './SmartKeyboardAvoidingContainer';
export { KeyboardAwareScrollView } from './SmartKeyboardAvoidingContainer';

// Re-export hooks for convenience
export { useKeyboardAvoidance, useInputFieldTracking, useKeyboardAvoidancePosition, useKeyboardScrollAdjustment } from '../../hooks/useKeyboardAvoidance';