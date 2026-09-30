/**
 * media/MediaTrimmer.tsx
 *
 * Video trimming UI with video preview player, playhead scrubber, audio waveform
 * visualization, drag handles, and 60-second limit enforcement.
 *
 * The native export call and time-formatting helper live in
 * `MediaTrimmer.helpers.ts`, and the waveform/thumbnail-strip/handles/time-labels
 * timeline lives in `MediaTrimmerScrubber.tsx` — split out to keep this file
 * focused on state, gestures, and the export flow.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
} from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Video from 'react-native-video';
import type { TrimRange, TrimResult, VideoFrame } from '../types';
import { trimNative } from './MediaTrimmer.helpers';
import { MediaTrimmerScrubber } from './MediaTrimmerScrubber';

const SCREEN_W = Dimensions.get('window').width;
const SCRUBBER_W = SCREEN_W - 32;

// ─── Props ────────────────────────────────────────────────────────────────────

interface MediaTrimmerProps {
  videoUri:    string;
  durationMs:  number;
  frames:      VideoFrame[];   // pre-extracted thumbnail frames
  onComplete:  (result: TrimResult) => void;
  onCancel:    () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MediaTrimmer({
  videoUri,
  durationMs,
  frames,
  onComplete,
  onCancel,
}: MediaTrimmerProps) {
  const [range,       setRange]       = useState<TrimRange>({ startMs: 0, endMs: Math.min(60000, durationMs) });
  const [useHardware, setUseHardware] = useState(true);
  const [exporting,   setExporting]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [error,       setError]       = useState<string | null>(null);

  // Scrubber playhead position tracking
  const [playPositionMs, setPlayPositionMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<any>(null);

  // Track handle positions as fractions [0,1]
  const startFrac = range.startMs / durationMs;
  const endFrac   = range.endMs   / durationMs;

  // Listen to native progress events
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('StellarFFmpegProgress', (data) => {
      if (data && typeof data.progress === 'number') {
        setProgress(data.progress);
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Loop back video playback to trim startMs if it exceeds endMs
  useEffect(() => {
    if (playPositionMs >= range.endMs || playPositionMs < range.startMs) {
      videoRef.current?.seek(range.startMs / 1000);
      setPlayPositionMs(range.startMs);
    }
  }, [playPositionMs, range.startMs, range.endMs]);

  // ── Gesture: left (start) handle ──────────────────────────────────────────

  const startHandle = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      const frac   = Math.max(0, Math.min(e.x / SCRUBBER_W, endFrac - 0.05));
      let newMs  = Math.round(frac * durationMs);

      // Enforce maximum duration of 60 seconds
      if (range.endMs - newMs > 60000) {
        newMs = range.endMs - 60000;
      }

      setRange((r) => ({ ...r, startMs: newMs }));
      videoRef.current?.seek(newMs / 1000);
      setPlayPositionMs(newMs);
    });

  // ── Gesture: right (end) handle ───────────────────────────────────────────

  const endHandle = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      const frac  = Math.min(1, Math.max(e.x / SCRUBBER_W, startFrac + 0.05));
      let newMs = Math.round(frac * durationMs);

      // Enforce maximum duration of 60 seconds
      if (newMs - range.startMs > 60000) {
        newMs = range.startMs + 60000;
      }

      setRange((r) => ({ ...r, endMs: newMs }));
      videoRef.current?.seek(range.startMs / 1000);
      setPlayPositionMs(range.startMs);
    });

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    const selectedLength = range.endMs - range.startMs;
    if (selectedLength > 60000) {
      setError('Clips cannot exceed 60 seconds in length.');
      return;
    }

    setExporting(true);
    setProgress(0);
    setError(null);
    try {
      const result = await trimNative({
        inputUri:        videoUri,
        range,
        outputFormat:    'mp4',
        hardwareEncoding: useHardware,
        videoBitrate:    4000,
        audioBitrate:    128,
      });
      onComplete(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [videoUri, range, useHardware, onComplete]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Video Preview Frame */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.videoPlayer}
          paused={paused}
          resizeMode="contain"
          onProgress={(data) => {
            setPlayPositionMs(data.currentTime * 1000);
          }}
          onLoad={() => {
            videoRef.current?.seek(range.startMs / 1000);
          }}
        />
        <TouchableOpacity
          style={styles.playPauseBtn}
          onPress={() => setPaused(!paused)}
        >
          <Text style={styles.playPauseText}>{paused ? '▶' : '⏸'}</Text>
        </TouchableOpacity>
      </View>

      <MediaTrimmerScrubber
        frames={frames}
        range={range}
        durationMs={durationMs}
        startFrac={startFrac}
        endFrac={endFrac}
        playPositionMs={playPositionMs}
        scrubberWidth={SCRUBBER_W}
        startHandle={startHandle}
        endHandle={endHandle}
      />

      {/* Hardware encoding toggle */}
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => setUseHardware((v) => !v)}
      >
        <View style={[styles.toggleDot, useHardware && styles.toggleDotActive]} />
        <Text style={styles.toggleLabel}>
          {useHardware ? 'Hardware encoding (faster 1080p/30fps)' : 'Software encoding'}
        </Text>
      </TouchableOpacity>

      {/* Progress bar */}
      {exporting && (
        <View style={styles.progressWrapper}>
          <Text style={styles.progressText}>Exporting: {Math.round(progress * 100)}%</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>
          <ActivityIndicator size="small" color="#6366f1" style={styles.spinner} />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={exporting}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Text style={styles.exportText}>{exporting ? 'Exporting…' : 'Export Clip'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0f0f0f', padding: 16 },
  videoContainer:   { height: 260, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 16, justifyContent: 'center' },
  videoPlayer:      { width: '100%', height: '100%' },
  playPauseBtn:     { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  playPauseText:    { color: '#fff', fontSize: 16 },
  toggleRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  toggleDot:        { width: 16, height: 16, borderRadius: 8, backgroundColor: '#3f3f46' },
  toggleDotActive:  { backgroundColor: '#6366f1' },
  toggleLabel:      { color: '#a1a1aa', fontSize: 13 },
  progressWrapper:  { marginBottom: 16, position: 'relative' },
  progressText:     { color: '#a1a1aa', fontSize: 12, marginBottom: 6, fontVariant: ['tabular-nums'] },
  progressContainer:{ height: 6, backgroundColor: '#27272a', borderRadius: 3, overflow: 'hidden' },
  progressBar:      { height: 6, backgroundColor: '#6366f1' },
  spinner:          { position: 'absolute', right: 0, top: 0 },
  error:            { color: '#f87171', fontSize: 13, marginBottom: 12 },
  actions:          { flexDirection: 'row', gap: 12, marginTop: 'auto' },
  cancelBtn:        { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center' },
  cancelText:       { color: '#a1a1aa', fontWeight: '600' },
  exportBtn:        { flex: 2, padding: 14, borderRadius: 10, backgroundColor: '#6366f1', alignItems: 'center' },
  exportBtnDisabled:{ opacity: 0.5 },
  exportText:       { color: '#fff', fontWeight: '700', fontSize: 15 },
});
