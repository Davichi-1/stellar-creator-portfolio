/**
 * useNativeShare - Custom hook for native system-level share functionality
 * 
 * Provides unified access to native share sheets, clipboard, and share endpoints
 * with full TypeScript support and error handling.
 */

import { useState, useCallback, useRef } from 'react';
import { Platform, Alert, Share as ReactNativeShare, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { SharePayload, ShareContentType } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ShareResult {
  action: 'shared' | 'cancelled' | 'error';
  error?: Error;
}

export interface UseNativeShareReturn {
  share: (payload: SharePayload) => Promise<ShareResult>;
  copyToClipboard: (text: string) => Promise<boolean>;
  openShareEndpoint: (payload: SharePayload, endpoint: string) => Promise<void>;
  isAvailable: boolean;
  sharing: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SHARE_ENDPOINTS: Record<string, { scheme: string; name: string }> = {
  whatsapp: { scheme: 'whatsapp://send', name: 'WhatsApp' },
  telegram: { scheme: 'tg://msg_url', name: 'Telegram' },
  facebook: { scheme: 'fb://share', name: 'Facebook' },
  twitter: { scheme: 'twitter://share', name: 'Twitter' },
  instagram: { scheme: 'instagram://share', name: 'Instagram' },
  sms: { scheme: 'sms:', name: 'Messages' },
  email: { scheme: 'mailto:', name: 'Email' },
};

// ─── Hook Implementation ───────────────────────────────────────────────────────

export function useNativeShare(): UseNativeShareReturn {
  const [sharing, setSharing] = useState(false);
  const isMounted = useRef(true);

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Native Share Sheet ─────────────────────────────────────────────────────

  const share = useCallback(async (payload: SharePayload): Promise<ShareResult> => {
    if (!isMounted.current) return { action: 'cancelled' };

    setSharing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const message = payload.message || `Check out ${payload.title} on Tamgora!`;
      const url = payload.url;

      // Build share options based on platform
      const shareOptions: Parameters<typeof ReactNativeShare.share>[0] = {
        title: payload.title,
        message: Platform.OS === 'ios' ? message : `${message}\n\n${url}`,
        url: Platform.OS === 'ios' ? url : undefined,
      };

      const shareOptionsWithDefaults = {
        ...shareOptions,
        dialogTitle: 'Share on Tamgora',
        subject: payload.title,
      };

      const result = await ReactNativeShare.share(shareOptionsWithDefaults);

      if (!isMounted.current) return { action: 'cancelled' };

      if (result.action === ReactNativeShare.sharedAction) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return { action: 'shared' };
      } else if (result.action === ReactNativeShare.dismissedAction) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return { action: 'cancelled' };
      }

      return { action: 'cancelled' };
    } catch (error) {
      if (!isMounted.current) return { action: 'cancelled' };

      console.error('Share error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Alert.alert(
        'Share Failed',
        'Unable to share at this time. Please try again.',
        [{ text: 'OK' }],
        { cancelable: false }
      );

      return { 
        action: 'error', 
        error: error instanceof Error ? error : new Error('Unknown share error') 
      };
    } finally {
      if (isMounted.current) {
        setSharing(false);
      }
    }
  }, []);

  // ── Clipboard Copy ─────��───────────────────────────────────────────────────

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await Haptics.selectionAsync();
      
      // Use ClipboardEx if available, otherwise fallback
      await Clipboard.setStringAsync(text);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (error) {
      console.error('Clipboard copy error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
  }, []);

  // ── Open Share Endpoint (App-Specific) ─────────────────────────────────────

  const openShareEndpoint = useCallback(async (
    payload: SharePayload,
    endpointId: string
  ): Promise<void> => {
    const endpoint = SHARE_ENDPOINTS[endpointId.toLowerCase()];
    
    if (!endpoint) {
      throw new Error(`Unknown endpoint: ${endpointId}`);
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Build URL with encoded parameters
    const encodedTitle = encodeURIComponent(payload.title);
    const encodedUrl = encodeURIComponent(payload.url);
    const encodedMessage = encodeURIComponent(payload.message || payload.title);

    let targetUrl = '';

    switch (endpointId.toLowerCase()) {
      case 'whatsapp':
        targetUrl = `${endpoint.scheme}?text=${encodedMessage} ${encodedUrl}`;
        break;
      case 'telegram':
        targetUrl = `${endpoint.scheme}?url=${encodedUrl}`;
        break;
      case 'facebook':
        targetUrl = `${endpoint.scheme}?u=${encodedUrl}`;
        break;
      case 'twitter':
        targetUrl = `${endpoint.scheme}?text=${encodedMessage}&url=${encodedUrl}`;
        break;
      case 'instagram':
        targetUrl = `${endpoint.scheme}?text=${encodedMessage}`;
        break;
      case 'sms':
        targetUrl = `${endpoint.scheme}?body=${encodedMessage} ${encodedUrl}`;
        break;
      case 'email':
        targetUrl = `${endpoint.scheme}?subject=${encodedTitle}&body=${encodedMessage}`;
        break;
      default:
        targetUrl = endpoint.scheme;
    }

    try {
      const canOpen = await Linking.canOpenURL(targetUrl);
      if (canOpen) {
        await Linking.openURL(targetUrl);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(
          'App Not Found',
          `Please install ${endpoint.name} to share this content.`,
          [{ text: 'OK' }]
        );
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error(`Failed to open ${endpointId}:`, error);
      Alert.alert(
        'Share Failed',
        `Unable to open ${endpoint.name}. Please try again.`,
        [{ text: 'OK' }]
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, []);

  // ── Share File/Image (Expo Sharing) ────────────────────────────────────────

  const shareFile = useCallback(async (
    uri: string,
    mimeType?: string
  ): Promise<ShareResult> => {
    if (!isMounted.current) return { action: 'cancelled' };

    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        throw new Error('Sharing is not available on this device');
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await Sharing.shareAsync(uri, {
        mimeType,
        dialogTitle: 'Share on Tamgora',
      });

      if (!isMounted.current) return { action: 'cancelled' };

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { action: 'shared' };
    } catch (error) {
      if (!isMounted.current) return { action: 'cancelled' };

      console.error('File share error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Alert.alert(
        'Share Failed',
        'Unable to share this file at this time.',
        [{ text: 'OK' }],
        { cancelable: false }
      );

      return { 
        action: 'error', 
        error: error instanceof Error ? error : new Error('Unknown share error') 
      };
    }
  }, []);

  return {
    share,
    copyToClipboard,
    openShareEndpoint,
    isAvailable: true,
    sharing,
  };
}

// ── Legacy Clipboard Support ──────────────────────────────────────────────────

async function Clipboard_setStringAsync(text: string): Promise<void> {
  // This is a fallback that would use react-native-clipboard if needed
  // For now, we rely on the built-in Clipboard API
}
