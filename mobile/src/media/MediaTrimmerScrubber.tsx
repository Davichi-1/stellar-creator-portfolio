import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import type { TrimRange, VideoFrame } from '../types';
import { msToDisplay } from './MediaTrimmer.helpers';

interface MediaTrimmerScrubberProps {
  frames: VideoFrame[];
  range: TrimRange;
  durationMs: number;
  startFrac: number;
  endFrac: number;
  playPositionMs: number;
  scrubberWidth: number;
  startHandle: PanGesture;
  endHandle: PanGesture;
}

/**
 * The trim timeline: audio waveform, thumbnail strip, selected-range overlay,
 * playback scrubber line, and the two drag handles — plus the start/selected
 * length/end time labels below it. Pulled out of `MediaTrimmer` to keep that
 * file focused on state and native export logic.
 */
export function MediaTrimmerScrubber({
  frames,
  range,
  durationMs,
  startFrac,
  endFrac,
  playPositionMs,
  scrubberWidth,
  startHandle,
  endHandle,
}: MediaTrimmerScrubberProps) {
  return (
    <>
      {/* Audio Waveform Visualization on the Timeline */}
      <View style={styles.waveformContainer}>
        {Array.from({ length: 40 }).map((_, i) => {
          const barFrac = i / 40;
          const isSelected = barFrac >= startFrac && barFrac <= endFrac;
          const height = 15 + Math.sin(i * 0.5) * 10 + Math.cos(i * 0.2) * 5;
          return (
            <View
              key={i}
              style={[
                styles.waveformBar,
                {
                  height,
                  backgroundColor: isSelected ? '#6366f1' : '#3f3f46',
                },
              ]}
            />
          );
        })}
      </View>

      {/* Thumbnail strip & Scrubber handles */}
      <View style={styles.strip}>
        {frames.map((f) => (
          <View
            key={f.index}
            style={[styles.frame, { width: scrubberWidth / Math.max(frames.length, 1) }]}
          />
        ))}

        {/* Selected range overlay */}
        <View
          style={[
            styles.rangeOverlay,
            { left: startFrac * scrubberWidth, width: (endFrac - startFrac) * scrubberWidth },
          ]}
        />

        {/* Playback Scrubber Line */}
        <View
          style={[
            styles.scrubberLine,
            { left: (playPositionMs / durationMs) * scrubberWidth }
          ]}
        />

        {/* Start handle */}
        <GestureDetector gesture={startHandle}>
          <View style={[styles.handle, styles.handleLeft, { left: startFrac * scrubberWidth - 10 }]}>
            <View style={styles.handleBar} />
          </View>
        </GestureDetector>

        {/* End handle */}
        <GestureDetector gesture={endHandle}>
          <View style={[styles.handle, styles.handleRight, { left: endFrac * scrubberWidth - 10 }]}>
            <View style={styles.handleBar} />
          </View>
        </GestureDetector>
      </View>

      {/* Time labels */}
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>{msToDisplay(range.startMs)}</Text>
        <Text style={styles.durationLabel}>
          {msToDisplay(range.endMs - range.startMs)} selected (Max 60.00s)
        </Text>
        <Text style={styles.timeLabel}>{msToDisplay(range.endMs)}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  waveformContainer:{ height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 },
  waveformBar:      { width: 4, borderRadius: 2 },
  strip:            { height: 64, flexDirection: 'row', borderRadius: 8, overflow: 'visible', position: 'relative', marginBottom: 8, backgroundColor: '#181825' },
  frame:            { height: 64, backgroundColor: 'rgba(255,255,255,0.03)' },
  rangeOverlay:     { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(99,102,241,0.2)', borderWidth: 2, borderColor: '#6366f1' },
  scrubberLine:     { position: 'absolute', top: -4, bottom: -4, width: 3, backgroundColor: '#ef4444', zIndex: 11, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 2 },
  handle:           { position: 'absolute', top: 0, bottom: 0, width: 20, justifyContent: 'center', alignItems: 'center', zIndex: 12 },
  handleLeft:       { backgroundColor: '#6366f1', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  handleRight:      { backgroundColor: '#6366f1', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  handleBar:        { width: 3, height: 24, backgroundColor: '#fff', borderRadius: 2 },
  timeRow:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  timeLabel:        { color: '#a1a1aa', fontSize: 12, fontVariant: ['tabular-nums'] },
  durationLabel:    { color: '#6366f1', fontSize: 12, fontWeight: '600' },
});
