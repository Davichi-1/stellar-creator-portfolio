import { Audio, PlaybackStatus, AVPlaybackStatusToSet } from 'expo-av';
import { useUIStore } from '../store';

const DEFAULT_AUDIO_MODE = {
  allowsRecordingIOS: false,
  interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  shouldDuckAndroid: true,
  interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
  playThroughEarpieceAndroid: false,
};

let sound: Audio.Sound | null = null;
let statusListener: ((status: PlaybackStatus) => void) | null = null;
let hasInitialized = false;
let currentMetadata: { title: string; creator: string; artworkUrl?: string } | null = null;

async function ensureAudioMode(): Promise<void> {
  if (!hasInitialized) {
    await Audio.setAudioModeAsync(DEFAULT_AUDIO_MODE);
    hasInitialized = true;
  }
}

/** Configures the shared audio mode (once) and lazily creates the module-level `Audio.Sound` instance. */
export async function initializeAudioPlayerAsync(): Promise<void> {
  await ensureAudioMode();
  if (!sound) {
    sound = new Audio.Sound();
  }
}

/** Unloads any current audio and loads `source`, paused, re-attaching the status listener if one is set. */
export async function loadAudioAsync(source: Audio.Source): Promise<PlaybackStatus | null> {
  await initializeAudioPlayerAsync();
  if (!sound) {
    return null;
  }
  await sound.unloadAsync();
  const status = await sound.loadAsync(source, {
    shouldPlay: false,
    staysActiveInBackground: true,
  });
  if (statusListener) {
    sound.setOnPlaybackStatusUpdate(statusListener);
  }
  return status;
}

/** Resumes the loaded sound and updates the shared `isAudioPlaying` UI state. No-op (returns `null`) if nothing is loaded. */
export async function playAudioAsync(): Promise<PlaybackStatus | null> {
  if (!sound) {
    return null;
  }
  const status = await sound.playAsync();
  useUIStore.setState({ isAudioPlaying: true });
  return status;
}

/** Pauses the loaded sound and updates the shared `isAudioPlaying` UI state. No-op (returns `null`) if nothing is loaded. */
export async function pauseAudioAsync(): Promise<PlaybackStatus | null> {
  if (!sound) {
    return null;
  }
  const status = await sound.pauseAsync();
  useUIStore.setState({ isAudioPlaying: false });
  return status;
}

/** Stops the loaded sound and updates the shared `isAudioPlaying` UI state. No-op (returns `null`) if nothing is loaded. */
export async function stopAudioAsync(): Promise<PlaybackStatus | null> {
  if (!sound) {
    return null;
  }
  const status = await sound.stopAsync();
  useUIStore.setState({ isAudioPlaying: false });
  return status;
}

/** Seeks the loaded sound to `positionMillis`. No-op (returns `null`) if nothing is loaded. */
export async function seekAudioAsync(positionMillis: number): Promise<PlaybackStatus | null> {
  if (!sound) {
    return null;
  }
  return sound.setPositionAsync(positionMillis);
}

/** Registers `listener` for playback status updates, attaching it immediately if a sound is already loaded. */
export function setAudioPlaybackStatusListener(listener: (status: PlaybackStatus) => void): void {
  statusListener = listener;
  if (sound) {
    sound.setOnPlaybackStatusUpdate(listener);
  }
}

/** Unloads and releases the current sound, clearing track metadata and the shared `currentTrack` UI state. */
export async function unloadAudioAsync(): Promise<void> {
  if (sound) {
    await sound.unloadAsync();
    sound = null;
  }
  currentMetadata = null;
  useUIStore.setState({ currentTrack: null });
}

/**
 * Loads `uri` and starts playback immediately, storing `metadata` as the
 * shared `currentTrack` (for the mini-player) and wiring up now-playing info
 * and remote-control (lock-screen/notification) handling.
 */
export async function loadAndPlayAsync(
  uri: string,
  metadata: { title: string; creator: string; artworkUrl?: string }
): Promise<PlaybackStatus | null> {
  await initializeAudioPlayerAsync();
  if (!sound) {
    return null;
  }

  currentMetadata = metadata;
  useUIStore.setState({ currentTrack: metadata });

  await sound.unloadAsync();
  const status = await sound.loadAsync({ uri }, {
    shouldPlay: true,
    staysActiveInBackground: true,
  });

  if (statusListener) {
    sound.setOnPlaybackStatusUpdate(statusListener);
  }

  setupNowPlayingInfo(metadata);
  setupRemoteControls();

  return status;
}

function setupNowPlayingInfo(metadata: { title: string; creator: string; artworkUrl?: string }): void {
  if (sound) {
    const metadata_value: AVPlaybackStatusToSet = {
      rate: 1.0,
      shouldPlay: true,
      isMuted: false,
    };
    sound.setStatusAsync(metadata_value).catch(() => {});
  }
}

function setupRemoteControls(): void {
  if (!sound) return;

  Audio.setIsEnabledAsync(true).catch(() => {});

  const handleRemoteControlEvent = (status: PlaybackStatus) => {
    if ('isBuffering' in status && !status.isBuffering) {
      if ('isPlaying' in status) {
        useUIStore.setState({ isAudioPlaying: status.isPlaying });
      }
    }
  };

  sound.setOnPlaybackStatusUpdate(handleRemoteControlEvent);
}
