/**
 * useNetworkStatus
 *
 * Simplified network status hook with convenient status flags.
 * Wraps useNetwork() for common use cases.
 *
 * Features:
 *  - Simplified boolean flags
 *  - Network type labels
 *  - Automatic reconnect handling
 */

import { useCallback } from 'react';
import { useNetwork } from './NetworkProvider';
import { useToast } from '../context/ToastContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  networkType: 'wifi' | 'cellular' | 'none' | 'unknown';
  networkTypeName: string;
  syncStatus: 'synced' | 'syncing' | 'error';
  pendingOpsCount: number;
}

// ─── Hook Implementation ───────────────────────────────────────────────────────

export function useNetworkStatus() {
  const network = useNetwork();
  const { showError } = useToast();

  // ── Simplified status derived from useNetwork ──────────────────────────────

  const status: NetworkStatus = {
    isOnline: network.isOnline,
    isOffline: !network.isOnline,
    networkType: useMemoNetworkType(network.networkType),
    networkTypeName: useMemoNetworkTypeName(network.networkType),
    syncStatus: network.syncStatus,
    pendingOpsCount: network.pendingOpsCount,
  };

  // ── Network type helpers ────────────────────────────────────────────────────

  function useMemoNetworkType(type: string | null): NetworkStatus['networkType'] {
    if (!type) return 'none';
    if (type.toLowerCase().includes('wifi')) return 'wifi';
    if (type.toLowerCase().includes('cellular') || type.toLowerCase().includes('wwan')) return 'cellular';
    return 'unknown';
  }

  function useMemoNetworkTypeName(type: string | null): string {
    if (!type) return 'Offline';
    switch (type.toLowerCase()) {
      case 'wifi': return 'WiFi';
      case 'cellular':
      case 'wwan': return 'Cellular';
      default: return type;
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  const showStatusToast = useCallback(() => {
    if (network.isOnline) {
      if (network.syncStatus === 'syncing') {
        // Sync in progress, no need to toast
      } else {
        // Just went online
        if (network.pendingOpsCount > 0) {
          // Toast queued for background sync
        }
      }
    } else {
      // Went offline
      if (showError && network.pendingOpsCount > 0) {
        // Operations queued for later
      }
    }
  }, [network.isOnline, network.syncStatus, network.pendingOpsCount, showError]);

  const manualSync = useCallback(async () => {
    if (network.isOnline) {
      await network.flushQueue();
    } else {
      if (showError) showError('Offline', 'Cannot sync while offline. Operations are queued.');
    }
  }, [network.isOnline, network.flushQueue, showError]);

  return {
    ...status,
    showStatusToast,
    manualSync,
    flushQueue: network.flushQueue,
  };
}
