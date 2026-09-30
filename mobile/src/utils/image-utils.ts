import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export type ImagePickerSource = 'camera' | 'library';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
}

export interface PickImageOptions {
  source?: ImagePickerSource;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  maxDimension?: number;
  mediaTypes?: ImagePicker.MediaTypeOptions;
}

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.8;

/**
 * Device-specific tuning. Lower-end Android devices and older iOS hardware
 * benefit from a smaller max dimension and lower JPEG quality to avoid
 * frame drops when rendering heavy imagery.
 */
export function getDeviceImageConfig(): { maxDimension: number; quality: number } {
  if (Platform.OS === 'android') {
    const version = typeof Platform.Version === 'number' ? Platform.Version : 0;
    if (version < 26) {
      return { maxDimension: 1080, quality: 0.7 };
    }
    return { maxDimension: 1440, quality: 0.75 };
  }
  if (Platform.OS === 'ios') {
    const version = parseInt(String(Platform.Version), 10);
    if (!Number.isNaN(version) && version < 13) {
      return { maxDimension: 1280, quality: 0.75 };
    }
    return { maxDimension: 1600, quality: 0.8 };
  }
  return { maxDimension: DEFAULT_MAX_DIMENSION, quality: DEFAULT_QUALITY };
}

/**
 * Request the correct permission for the requested source. Returns true when
 * the permission is granted (or not required on the current platform).
 */
export async function ensureImagePermission(source: ImagePickerSource): Promise<boolean> {
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Resize/compress a picked asset so heavy imagery does not cause frame drops
 * during rendering. Returns the original asset when manipulation is not needed.
 */
export async function optimizeImage(
  asset: ImagePicker.ImagePickerAsset,
  maxDimension: number,
  quality: number,
): Promise<PickedImage> {
  const longestSide = Math.max(asset.width ?? 0, asset.height ?? 0);
  const needsResize = longestSide > maxDimension;

  if (!needsResize) {
    return {
      uri: asset.uri,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
      mimeType: asset.mimeType,
      fileName: asset.fileName ?? undefined,
      fileSize: asset.fileSize,
    };
  }

  const actions: ImageManipulator.Action[] = [];
  if ((asset.width ?? 0) >= (asset.height ?? 0)) {
    actions.push({ resize: { width: maxDimension } });
  } else {
    actions.push({ resize: { height: maxDimension } });
  }

  const result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: 'image/jpeg',
    fileName: asset.fileName ?? undefined,
    fileSize: asset.fileSize,
  };
}

/**
 * Device-specific image picker entry point. Handles permission checks,
 * camera vs library selection, and native optimization of heavy imagery.
 */
export async function pickImage(options: PickImageOptions = {}): Promise<PickedImage | null> {
  const source = options.source ?? 'library';
  const granted = await ensureImagePermission(source);
  if (!granted) {
    return null;
  }

  const deviceConfig = getDeviceImageConfig();
  const maxDimension = options.maxDimension ?? deviceConfig.maxDimension;
  const quality = options.quality ?? deviceConfig.quality;

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: options.mediaTypes ?? ImagePicker.MediaTypeOptions.Images,
    allowsEditing: options.allowsEditing ?? false,
    quality,
  };

  if (options.aspect) {
    pickerOptions.aspect = options.aspect;
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return optimizeImage(result.assets[0], maxDimension, quality);
}
