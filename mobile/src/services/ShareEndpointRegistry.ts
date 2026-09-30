/**
 * ShareEndpointRegistry
 *
 * Manages share endpoints with native system-level capabilities.
 * Provides centralized endpoint discovery, validation, and sharing.
 */

import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { SharePayload, ShareContentType, ShareEndpoint } from '../types';

// ─── Endpoint Definitions ──────────────────────────────────────────────────────

const ENDPOINTS: ShareEndpoint[] = [
  // Social Media
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    type: 'social',
    supportedContentTypes: ['profile', 'bounty', 'portfolio', 'link'],
    canShare: () => true,
    share: async (payload) => {
      const url = Platform.OS === 'ios'
        ? `fb://share?u=${encodeURIComponent(payload.url)}`
        : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(payload.url)}`;
      await Linking.openURL(url);
    },
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: '🐦',
    type: 'social',
    supportedContentTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
    canShare: () => true,
    share: async (payload) => {
      const text = `${payload.message || payload.title} ${payload.url}`;
      const url = Platform.OS === 'ios'
        ? `twitter://post?message=${encodeURIComponent(text)}`
        : `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(payload.url)}`;
      await Linking.openURL(url);
    },
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    type: 'social',
    supportedContentTypes: ['profile', 'portfolio', 'achievement'],
    canShare: async () => {
      try {
        return await Linking.canOpenURL('instagram://share');
      } catch {
        return false;
      }
    },
    share: async (payload) => {
      const url = Platform.OS === 'ios'
        ? `instagram://share?text=${encodeURIComponent(payload.message || payload.title)}`
        : `https://api.instagram.com/share?text=${encodeURIComponent(payload.message || payload.title)}`;
      await Linking.openURL(url);
    },
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    type: 'social',
    supportedContentTypes: ['profile', 'bounty', 'portfolio', 'achievement'],
    canShare: () => true,
    share: async (payload) => {
      const url = Platform.OS === 'ios'
        ? `linkedin://share?url=${encodeURIComponent(payload.url)}&title=${encodeURIComponent(payload.title)}`
        : `https://www.linkedin.com/shareArticle?url=${encodeURIComponent(payload.url)}&title=${encodeURIComponent(payload.title)}`;
      await Linking.openURL(url);
    },
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: '👽',
    type: 'social',
    supportedContentTypes: ['profile', 'bounty', 'portfolio', 'link', 'review'],
    canShare: () => true,
    share: async (payload) => {
      const url = `https://www.reddit.com/submit?url=${encodeURIComponent(payload.url)}&title=${encodeURIComponent(payload.title)}`;
      await Linking.openURL(url);
    },
  },
  // Messaging
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '💚',
    type: 'messaging',
    supportedContentTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
    canShare: async () => {
      try {
        return await Linking.canOpenURL('whatsapp://send');
      } catch {
        return false;
      }
    },
    share: async (payload) => {
      const text = `${payload.message || payload.title} ${payload.url}`;
      const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
      await Linking.openURL(url);
    },
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '💬',
    type: 'messaging',
    supportedContentTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
    canShare: async () => {
      try {
        return await Linking.canOpenURL('tg://msg_url');
      } catch {
        return false;
      }
    },
    share: async (payload) => {
      const url = `https://t.me/share/url?url=${encodeURIComponent(payload.url)}`;
      await Linking.openURL(url);
    },
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    icon: '👻',
    type: 'messaging',
    supportedContentTypes: ['profile', 'portfolio', 'achievement'],
    canShare: async () => {
      try {
        return await Linking.canOpenURL('snapchat://share');
      } catch {
        return false;
      }
    },
    share: async (payload) => {
      const url = `snapchat://share?text=${encodeURIComponent(payload.message || payload.title)}`;
      await Linking.openURL(url);
    },
  },
  // Communication
  {
    id: 'sms',
    name: 'Messages',
    icon: '📱',
    type: 'messaging',
    supportedContentTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
    canShare: () => true,
    share: async (payload) => {
      const text = `${payload.message || payload.title} ${payload.url}`;
      const url = Platform.OS === 'ios'
        ? `sms:?body=${encodeURIComponent(text)}`
        : `sms:?body=${encodeURIComponent(text)}`;
      await Linking.openURL(url);
    },
  },
  {
    id: 'email',
    name: 'Email',
    icon: '📧',
    type: 'email',
    supportedContentTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
    canShare: () => true,
    share: async (payload) => {
      const url = Platform.OS === 'ios'
        ? `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(payload.message || payload.title)}`
        : `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(payload.message || payload.title)}`;
      await Linking.openURL(url);
    },
  },
  // System
  {
    id: 'clipboard',
    name: 'Copy to Clipboard',
    icon: '🔗',
    type: 'system',
    supportedContentTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
    canShare: () => true,
    share: async (payload) => {
      await Clipboard.setStringAsync(payload.url);
    },
  },
];

// ─── Registry Class ────────────────────────────────────────────────────────────

export class ShareEndpointRegistry {
  private endpoints: Map<string, ShareEndpoint>;

  constructor(endpoints: ShareEndpoint[] = ENDPOINTS) {
    this.endpoints = new Map();
    for (const endpoint of endpoints) {
      this.endpoints.set(endpoint.id, endpoint);
    }
  }

  // Get all endpoints
  getAll(): ShareEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  // Get endpoints by content type
  getByType(contentType: ShareContentType): ShareEndpoint[] {
    return this.getAll().filter((e) => e.supportedContentTypes.includes(contentType));
  }

  // Get endpoint by ID
  getById(id: string): ShareEndpoint | undefined {
    return this.endpoints.get(id);
  }

  // Check if endpoint can share
  async canShare(id: string, payload: SharePayload): Promise<boolean> {
    const endpoint = this.getById(id);
    if (!endpoint) return false;
    return await endpoint.canShare(payload);
  }

  // Share via endpoint
  async share(id: string, payload: SharePayload): Promise<void> {
    const endpoint = this.getById(id);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${id}`);
    }
    await endpoint.share(payload);
  }

  // Get available endpoints for payload
  async getAvailable(payload: SharePayload): Promise<ShareEndpoint[]> {
    const all = this.getByType(payload.type);
    const available: ShareEndpoint[] = [];
    for (const endpoint of all) {
      if (await endpoint.canShare(payload)) {
        available.push(endpoint);
      }
    }
    return available;
  }

  // Get system share endpoint
  getSystemShare(): ShareEndpoint {
    return {
      id: 'native',
      name: Platform.OS === 'ios' ? 'Share…' : 'Share',
      icon: '📤',
      type: 'system',
      supportedContentTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
      canShare: () => true,
      share: async () => {
        // Use native Share API
        // This would be handled by ShareSheet component
      },
    };
  }
}

// ─── Singleton Instance ────────────────────────────────────────────────────────

export const shareEndpointRegistry = new ShareEndpointRegistry();
