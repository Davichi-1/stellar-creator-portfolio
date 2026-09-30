import { NativeModules } from 'react-native';
import type { TrimOptions, TrimResult } from '../types';

const { StellarFFmpeg } = NativeModules;

// ─── Native bridge call ───────────────────────────────────────────────────────

export async function trimNative(opts: TrimOptions): Promise<TrimResult> {
  const outputUri = opts.inputUri.replace(/\.[^.]+$/, `_trimmed.${opts.outputFormat}`);
  return StellarFFmpeg.trimVideo({
    inputUri:        opts.inputUri,
    outputUri:       outputUri,
    startMs:         opts.range.startMs,
    endMs:           opts.range.endMs,
    videoBitrate:    opts.videoBitrate ?? 4000,
    audioBitrate:    opts.audioBitrate ?? 128,
    hardwareEncoding: opts.hardwareEncoding,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function msToDisplay(ms: number): string {
  const s   = Math.floor(ms / 1000);
  const min = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  const frac = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
  return `${min}:${sec}.${frac}`;
}
