/**
 * ShareScreen
 *
 * Issue 3 — "Enable explicit native system level Share capabilities
 * communicating to generic endpoints globally"
 *
 * Features:
 *  - Native OS share sheet via expo-sharing + Share API
 *  - Clipboard copy with confirmation toast
 *  - Contextual share messages per content type (profile / bounty / review / achievement)
 *  - URL preview card
 *  - All share text fully i18n'd
 *  - Haptic feedback on every action
 *  - Graceful error handling
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ExpoSharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { ShareOptionRow } from '../components/share/ShareOptionRow';
import { Badge } from '../components/ui/Badge';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from '../theme/tokens';
import { SharePayload } from '../types';
import { useI18n } from '../i18n/I18nProvider';

// ─── Component ────────────────────────────────────────────────────────────────

interface ShareScreenProps {
  payload?: SharePayload;
  onClose?: () => void;
}

const DEFAULT_PAYLOAD: SharePayload = {
  type: 'profile',
  title: 'Alice Chen — UX Designer',
  message: 'Check out Alice Chen on Tamgora — the creator marketplace!',
  url: 'https://stellar.app/creators/alice-chen',
};

export function ShareScreen({ payload = DEFAULT_PAYLOAD, onClose }: ShareScreenProps) {
  const { t } = useI18n();
  const [copied, setCopied]     = useState(false);
  const [sharing, setSharing]   = useState(false);

  // ── Build localised share message ──────────────────────────────────────────

  const buildMessage = useCallback((): string => {
    switch (payload.type) {
      case 'profile':
        return t('share.shareMessage', { name: payload.title });
      case 'bounty':
        return t('share.shareBountyMessage', { title: payload.title });
      case 'review':
        return t('share.shareReviewMessage', { name: payload.title });
      case 'achievement':
        return t('share.shareAchievementMessage', { achievement: payload.title });
      default:
        return payload.message;
    }
  }, [payload, t]);

  // ── Native OS share sheet ──────────────────────────────────────────────────

  const handleNativeShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const message = buildMessage();
      const result = await Share.share(
        {
          title:   payload.title,
          message: Platform.OS === 'ios' ? message : `${message}\n${payload.url}`,
          url:     Platform.OS === 'ios' ? payload.url : undefined,
        },
        {
          dialogTitle: t('share.nativeShareTitle'),
          subject:     payload.title,
        },
      );

      if (result.action === Share.sharedAction) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert('', t('share.shareError'));
    } finally {
      setSharing(false);
    }
  }, [sharing, buildMessage, payload, t]);

  // ── Clipboard copy ─────────────────────────────────────────────────────────

  const handleCopyLink = useCallback(async () => {
    await Haptics.selectionAsync();
    try {
      // React Native's Clipboard API
      Clipboard.setString(payload.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert('', t('share.shareError'));
    }
  }, [payload.url, t]);

  // ── expo-sharing (file / image share) ─────────────────────────────────────

  const handleExpoShare = useCallback(async () => {
    const available = await ExpoSharing.isAvailableAsync();
    if (!available) {
      Alert.alert('', t('share.shareError'));
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // In production: pass a local file URI (e.g. a generated share card image)
    // For now we fall back to the native Share API
    await handleNativeShare();
  }, [handleNativeShare, t]);

  // ── Content type icon ──────────────────────────────────────────────────────

  const TYPE_ICON: Record<SharePayload['type'], string> = {
    profile:     '👤',
    bounty:      '📋',
    review:      '⭐',
    achievement: '🏆',
  };

  const TYPE_LABEL_KEY: Record<SharePayload['type'], string> = {
    profile:     'share.shareProfile',
    bounty:      'share.shareBounty',
    review:      'share.shareReview',
    achievement: 'share.shareAchievement',
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{t('share.screenTitle')}</Text>
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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Content preview card */}
        <View style={styles.previewCard}>
          <View style={styles.previewIconWrap}>
            <Text style={styles.previewIcon}>{TYPE_ICON[payload.type]}</Text>
          </View>
          <View style={styles.previewText}>
            <Badge
              label={t(TYPE_LABEL_KEY[payload.type])}
              variant="primary"
              style={styles.typeBadge}
            />
            <Text style={styles.previewTitle} numberOfLines={2}>{payload.title}</Text>
            <Text style={styles.previewUrl} numberOfLines={1}>{payload.url}</Text>
          </View>
        </View>

        {/* Share message preview */}
        <View style={styles.messagePreview}>
          <Text style={styles.messagePreviewLabel}>
            {t('share.shareOptions')}
          </Text>
          <Text style={styles.messagePreviewText}>{buildMessage()}</Text>
        </View>

        {/* Share options */}
        <Text style={styles.sectionLabel}>{t('share.shareVia')}</Text>

        <ShareOptionRow
          icon="📤"
          label={t('share.shareVia')}
          sublabel={t('share.nativeShareTitle')}
          onPress={handleNativeShare}
          disabled={sharing}
          variant="primary"
        />

        <ShareOptionRow
          icon={copied ? '✅' : '🔗'}
          label={copied ? t('share.linkCopied') : t('share.copyLink')}
          sublabel={payload.url}
          onPress={handleCopyLink}
          variant={copied ? 'primary' : 'default'}
        />

        <ShareOptionRow
          icon="📱"
          label={t('share.shareToMessages')}
          onPress={handleNativeShare}
        />

        <ShareOptionRow
          icon="📧"
          label={t('share.shareToEmail')}
          onPress={handleNativeShare}
        />

        <ShareOptionRow
          icon="🌐"
          label={t('share.shareToSocial')}
          onPress={handleExpoShare}
        />

        {/* URL display */}
        <View style={styles.urlCard}>
          <Text style={styles.urlLabel}>{t('share.profileUrl')}</Text>
          <Text style={styles.urlValue} selectable numberOfLines={2}>
            {payload.url}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  screenTitle: {
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
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadow.md,
    gap: Spacing.md,
    alignItems: 'center',
  },
  previewIconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewIcon: {
    fontSize: 28,
  },
  previewText: {
    flex: 1,
  },
  typeBadge: {
    marginBottom: Spacing.xs,
  },
  previewTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  previewUrl: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  messagePreview: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  messagePreviewLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  messagePreviewText: {
    fontSize: FontSize.base,
    color: Colors.text,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  urlCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  urlLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  urlValue: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
});
