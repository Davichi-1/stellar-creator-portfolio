/**
 * Video embed helpers for the rich-text editor.
 *
 * Only YouTube and Loom are supported. URLs are parsed with `URL` (never
 * matched with a loose regex) so look-alike hosts such as
 * `https://evil.example/?u=youtube.com` cannot be turned into an iframe.
 */

export type VideoProvider = 'youtube' | 'loom';

export interface VideoEmbed {
  provider: VideoProvider;
  id: string;
  embedUrl: string;
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const LOOM_HOSTS = new Set(['loom.com', 'www.loom.com']);

const YOUTUBE_ID = /^[\w-]{11}$/;
const LOOM_ID = /^[a-f0-9]{32}$/i;

/** Hosts an embedded `<iframe src>` may point at once sanitized. */
const EMBED_SRC_PREFIXES = [
  'https://www.youtube-nocookie.com/embed/',
  'https://www.youtube.com/embed/',
  'https://www.loom.com/embed/',
];

function parseYouTube(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') return parts[0] ?? null;
  if (!YOUTUBE_HOSTS.has(host)) return null;
  if (parts[0] === 'watch') return url.searchParams.get('v');
  if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) return parts[1] ?? null;
  return null;
}

function parseLoom(url: URL): string | null {
  if (!LOOM_HOSTS.has(url.hostname.toLowerCase())) return null;
  const [kind, id] = url.pathname.split('/').filter(Boolean);
  return kind === 'share' || kind === 'embed' ? (id ?? null) : null;
}

/** Turn a pasted YouTube / Loom link into a canonical embed descriptor. */
export function parseVideoUrl(input: string): VideoEmbed | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const youtubeId = parseYouTube(url);
  if (youtubeId && YOUTUBE_ID.test(youtubeId)) {
    return {
      provider: 'youtube',
      id: youtubeId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
    };
  }

  const loomId = parseLoom(url);
  if (loomId && LOOM_ID.test(loomId)) {
    return { provider: 'loom', id: loomId, embedUrl: `https://www.loom.com/embed/${loomId}` };
  }

  return null;
}

/** True when `src` is exactly an embed URL this module would have produced. */
export function isAllowedEmbedSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  const prefix = EMBED_SRC_PREFIXES.find((p) => src.startsWith(p));
  if (!prefix) return false;
  const rest = src.slice(prefix.length);
  const id = rest.split(/[?#]/)[0];
  return prefix.includes('loom.com') ? LOOM_ID.test(id) : YOUTUBE_ID.test(id);
}

/** Recover the provider from an already-validated embed `src`. */
export function providerFromEmbedSrc(src: string): VideoProvider {
  return src.includes('loom.com') ? 'loom' : 'youtube';
}
