'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseProfileLink, type LinkVerification, type ProfileLinkKind } from '@/lib/profile-links';

interface Options {
  /** Wait this long after the last keystroke before calling the API. */
  debounceMs?: number;
}

/** Kinds whose links the server can confirm against the provider. */
const REMOTE_KINDS: ReadonlySet<ProfileLinkKind> = new Set(['github', 'figma']);

/**
 * Live verification for a profile link.
 *
 * Empty input and malformed URLs are resolved locally and instantly; only
 * well-formed GitHub / Figma links hit `/api/profile/verify-link` (debounced,
 * abortable).
 */
export function useLinkVerification(
  kind: ProfileLinkKind,
  value: string | undefined,
  { debounceMs = 600 }: Options = {},
): LinkVerification {
  const trimmed = (value ?? '').trim();
  const key = `${kind}:${trimmed}`;
  const [remote, setRemote] = useState<{ key: string; result: LinkVerification } | null>(null);

  const local = useMemo<LinkVerification | null>(() => {
    if (!trimmed) return { kind, status: 'idle' };
    const parsed = parseProfileLink(kind, trimmed);
    if (!parsed.ok) return { kind, status: 'invalid', message: parsed.reason };
    if (!REMOTE_KINDS.has(kind)) {
      return { kind, status: 'unverified', url: parsed.url, message: 'Link format looks valid' };
    }
    return null; // needs a round trip
  }, [kind, trimmed]);

  useEffect(() => {
    if (local) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/profile/verify-link?kind=${kind}&url=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const result: LinkVerification = res.ok
          ? await res.json()
          : { kind, status: 'error', message: 'Verification is unavailable right now' };
        setRemote({ key, result });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setRemote({ key, result: { kind, status: 'error', message: 'Could not reach the verifier' } });
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [local, kind, trimmed, key, debounceMs]);

  if (local) return local;
  return remote?.key === key ? remote.result : { kind, status: 'checking' };
}
