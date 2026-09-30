/**
 * QRScannerModal — Camera-based QR code scanner using expo-barcode-scanner.
 *
 * Opens the device camera, scans for QR codes, and extracts a Stellar
 * public key (G...) from the scanned data. Supports both raw addresses
 * and deeplinks/URLs that embed an address as a query param.
 *
 * Closes #1395
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { FontSize, FontWeight, Radius, Spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (address: string) => void;
}

/** Extract a Stellar public key from arbitrary scanned text. */
export function extractStellarAddress(rawData: string): string | null {
  const trimmed = rawData.trim();

  // Case 1: raw Stellar address (starts with G, 56 chars)
  if (/^G[A-Z2-7]{55}$/.test(trimmed)) {
    return trimmed;
  }

  // Case 2: URL / deeplink with address as a query param
  try {
    const url = new URL(trimmed);
    const params = ['address', 'to', 'recipient', 'destination', 'account'];
    for (const param of params) {
      const value = url.searchParams.get(param);
      if (value && /^G[A-Z2-7]{55}$/.test(value)) {
        return value;
      }
    }
    // Check if the pathname itself is an address
    const pathSegment = url.pathname.replace(/^\//, '');
    if (/^G[A-Z2-7]{55}$/.test(pathSegment)) {
      return pathSegment;
    }
  } catch {
    // Not a URL — fall through
  }

  // Case 3: search for a Stellar address pattern anywhere in the string
  const match = trimmed.match(/G[A-Z2-7]{55}/);
  if (match) {
    return match[0];
  }

  return null;
}

export function QRScannerModal({ visible, onClose, onScanned }: QRScannerModalProps) {
  const { colors } = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request camera permission when the modal becomes visible
  useEffect(() => {
    if (!visible) {
      setScanned(false);
      setError(null);
      return;
    }

    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        setError('Camera permission is required to scan QR codes');
      }
    })();
  }, [visible]);

  const handleBarCodeScanned = useCallback(
    ({ data }: { type: string; data: string }) => {
      if (scanned) return; // Prevent multiple scans

      const address = extractStellarAddress(data);
      if (address) {
        setScanned(true);
        onScanned(address);
      } else {
        // Not a valid Stellar address — allow re-scan
        setError('No valid Stellar address found in QR code. Try again.');
        // Reset after a brief delay so the user can re-scan
        setTimeout(() => setError(null), 2000);
      }
    },
    [scanned, onScanned],
  );

  const handleClose = useCallback(() => {
    setScanned(false);
    setError(null);
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Scan QR Code</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Camera / Scanner */}
        {hasPermission === null ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Requesting camera permission...
            </Text>
          </View>
        ) : hasPermission === false ? (
          <View style={styles.centerContent}>
            <Text style={[styles.errorText, { color: colors.error ?? '#E74C3C' }]}>
              {error ?? 'Camera permission denied'}
            </Text>
            <Pressable
              onPress={handleClose}
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.retryText}>Go Back</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.scannerContainer}>
            <BarCodeScanner
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
              barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
            />

            {/* Overlay frame */}
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.scanFrame} />
            </View>

            {/* Hint text */}
            <View style={styles.hintContainer} pointerEvents="none">
              <Text style={[styles.hintText, { color: '#FFFFFF' }]}>
                Point the camera at a QR code containing a Stellar address
              </Text>
            </View>

            {/* Error toast */}
            {error && (
              <View style={styles.errorToast}>
                <Text style={styles.errorToastText}>{error}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const SCAN_FRAME_SIZE = screenWidth * 0.65;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    minWidth: 60,
    paddingVertical: Spacing.sm,
  },
  closeText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: Radius.lg,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  hintText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  errorText: {
    fontSize: FontSize.base,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  errorToast: {
    position: 'absolute',
    bottom: 140,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  errorToastText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
