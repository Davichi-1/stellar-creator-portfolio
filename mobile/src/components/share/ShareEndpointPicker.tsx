/**
 * ShareEndpointPicker
 *
 * Native system-level share endpoint selector with support for:
 * - App-specific share targets (WhatsApp, Telegram, Facebook, etc.)
 * - System share sheet fallback
 * - Clipboard copy
 * - URL scheme-based deep linking
 *
 * Features:
 *  - Optimized rendering with FlatList for 60fps
 *  - Native Haptics feedback
 *  - Platform-specific endpoint availability detection
 *  - Content type validation per endpoint
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { SharePayload, ShareContentType } from '../../types';
import { useI18n } from '../../i18n/I18nProvider';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from '../../theme/tokens';

// ─── Endpoint Configuration ────────────────────────────────────────────────────

interface ShareEndpointDef {
  id: string;
  name: string;
  icon: string;
  type: 'social' | 'messaging' | 'email' | 'system';
  supportedTypes: ShareContentType[];
  scheme?: string;
  urlPattern?: (payload: SharePayload) => string;
}

const ENDPOINTS: ShareEndpointDef[] = [
  // Social Media
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    type: 'social',
    supportedTypes: ['profile', 'bounty', 'portfolio', 'link'],
    scheme: 'fb://share',
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: '🐦',
    type: 'social',
    supportedTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
    scheme: 'twitter://share',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    type: 'social',
    supportedTypes: ['profile', 'portfolio', 'achievement'],
    scheme: 'instagram://share',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    type: 'social',
    supportedTypes: ['profile', 'bounty', 'portfolio', 'achievement'],
    scheme: 'linkedin://share',
  },
  // Messaging Apps
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '💚',
    type: 'messaging',
    supportedTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
    scheme: 'whatsapp://send',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '💬',
    type: 'messaging',
    supportedTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
    scheme: 'tg://msg_url',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    icon: '👻',
    type: 'messaging',
    supportedTypes: ['profile', 'portfolio', 'achievement'],
    scheme: 'snapchat://share',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: '👽',
    type: 'messaging',
    supportedTypes: ['profile', 'bounty', 'portfolio', 'link', 'review'],
    scheme: 'reddit://share',
  },
  // Communication
  {
    id: 'sms',
    name: 'Messages',
    icon: '📱',
    type: 'messaging',
    supportedTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
  },
  {
    id: 'email',
    name: 'Email',
    icon: '📧',
    type: 'email',
    supportedTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
  },
  // System
  {
    id: 'native',
    name: 'Share…',
    icon: '📤',
    type: 'system',
    supportedTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
  },
  {
    id: 'clipboard',
    name: 'Copy Link',
    icon: '🔗',
    type: 'system',
    supportedTypes: ['profile', 'bounty', 'portfolio', 'link', 'review', 'achievement'],
  },
];

// ─── Helper Functions ──────────────────────────────────────────────────────────

function buildEndpointUrl(endpoint: ShareEndpointDef, payload: SharePayload): string {
  const encodedTitle = encodeURIComponent(payload.title);
  const encodedUrl = encodeURIComponent(payload.url);
  const encodedMessage = encodeURIComponent(payload.message || payload.title);

  switch (endpoint.id) {
    case 'whatsapp':
      return `whatsapp://send?text=${encodedMessage}%20${encodedUrl}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}`;
    case 'facebook':
      return `fb://share?u=${encodedUrl}`;
    case 'twitter':
      return `twitter://share?text=${encodedMessage}&url=${encodedUrl}`;
    case 'instagram':
      return `instagram://share?text=${encodedMessage}`;
    case 'linkedin':
      return `linkedin://share?url=${encodedUrl}&title=${encodedTitle}&source=Tamgora`;
    case 'snapchat':
      return `snapchat://share?text=${encodedMessage}`;
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
    case 'sms':
      return `sms:?body=${encodedMessage}%20${encodedUrl}`;
    case 'email':
      return `mailto:?subject=${encodedTitle}&body=${encodedMessage}`;
    case 'native':
    case 'clipboard':
    default:
      return '';
  }
}

async function openEndpointUrl(url: string): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to open URL:', error);
    return false;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface ShareEndpointPickerProps {
  payload: SharePayload;
  onSelect?: (endpoint: ShareEndpointDef) => void;
  onClose?: () => void;
  showSystemEndpoints?: boolean;
}

export function ShareEndpointPicker({
  payload,
  onSelect,
  onClose,
  showSystemEndpoints = true,
}: ShareEndpointPickerProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter endpoints based on search and content type
  const filteredEndpoints = useMemo(() => {
    const searchTerm = search.toLowerCase();
    return ENDPOINTS.filter((endpoint) => {
      // Check if content type is supported
      if (!endpoint.supportedTypes.includes(payload.type)) {
        return false;
      }

      // Check if system endpoints should be shown
      if (!showSystemEndpoints && endpoint.type === 'system') {
        return false;
      }

      // Search filter
      if (searchTerm) {
        return endpoint.name.toLowerCase().includes(searchTerm);
      }

      return true;
    });
  }, [search, payload.type, showSystemEndpoints]);

  // Group endpoints by type
  const groupedEndpoints = useMemo(() => {
    const groups: Record<string, ShareEndpointDef[]> = {
      social: [],
      messaging: [],
      email: [],
      system: [],
    };

    filteredEndpoints.forEach((endpoint) => {
      if (groups[endpoint.type]) {
        groups[endpoint.type].push(endpoint);
      }
    });

    return groups;
  }, [filteredEndpoints]);

  // Handle endpoint selection
  const handleEndpointSelect = useCallback(async (endpoint: ShareEndpointDef) => {
    if (loading === endpoint.id) return;

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Special handling for system endpoints
    if (endpoint.id === 'native') {
      setLoading(null);
      if (onSelect) {
        onSelect(endpoint);
      }
      return;
    }

    if (endpoint.id === 'clipboard') {
      setLoading(null);
      try {
        await Clipboard.setStringAsync(payload.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (onClose) onClose();
      } catch (error) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.error('Clipboard error:', error);
      }
      return;
    }

    setLoading(endpoint.id);
    const url = buildEndpointUrl(endpoint, payload);

    try {
      const success = await openEndpointUrl(url);
      setLoading(null);

      if (success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (onSelect) onSelect(endpoint);
        if (onClose) onClose();
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'App Not Found',
          `Please install ${endpoint.name} to share this content.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setLoading(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Share error:', error);
    }
  }, [loading, payload, onSelect, onClose]);

  // Render endpoint row
  const renderEndpointRow = useCallback(
    ({ item }: { item: ShareEndpointDef }) => (
      <Pressable
        onPress={() => handleEndpointSelect(item)}
        disabled={loading !== null}
        style={({ pressed }) => [
          styles.row,
          pressed && styles.rowPressed,
          loading === item.id && styles.rowDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        accessibilityState={{ disabled: loading !== null }}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{item.icon}</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.type}>{t(`share.endpointType.${item.type}`) || item.type}</Text>
        </View>
        {loading === item.id ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </Pressable>
    ),
    [handleEndpointSelect, loading, t]
  );

  // Render group header
  const renderGroupHeader = useCallback(
    ({ section }: { section: { title: string; data: ShareEndpointDef[] } }) => {
      if (section.data.length === 0) return null;
      return (
        <Text style={styles.groupHeader}>{section.title}</Text>
      );
    },
    []
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('share.selectEndpoint')}
        </Text>
        {onClose && (
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInputText}
            placeholder={t('share.searchEndpoints') || 'Search endpoints...'}
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Endpoint List */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FlatList
          data={filteredEndpoints}
          keyExtractor={(item) => item.id}
          renderItem={renderEndpointRow}
          ListHeaderComponent={renderGroupHeader}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚫</Text>
              <Text style={styles.emptyText}>
                {search
                  ? t('share.noResults')
                  : t('share.noEndpoints')}
              </Text>
            </View>
          }
        />

        {/* Share Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>{t('share.preview')}</Text>
          <View style={styles.previewContent}>
            <Text style={styles.previewTitle} numberOfLines={2}>
              {payload.title}
            </Text>
            <Text style={styles.previewUrl} numberOfLines={1}>
              {payload.url}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchIcon: {
    fontSize: FontSize.base,
    color: Colors.textTertiary,
  },
  searchInputText: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text,
    paddingVertical: 0,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  groupHeader: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  rowPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
  rowDisabled: {
    opacity: 0.5,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 22,
  },
  textWrap: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  type: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  chevron: {
    fontSize: FontSize.xl,
    color: Colors.textTertiary,
    marginLeft: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: FontSize.base,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginTop: Spacing.base,
    ...Shadow.sm,
  },
  previewLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  previewContent: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  previewTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  previewUrl: {
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
});
