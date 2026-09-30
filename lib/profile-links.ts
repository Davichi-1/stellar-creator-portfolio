/**
 * Profile link parsing + verification (issue #1336).
 *
 * `parseProfileLink` is pure and runs on both client and server. It extracts a
 * canonical handle / file key from a pasted URL. `verifyProfileLink` is
 * server-only: it asks GitHub / Figma whether the linked resource really
 * exists. Outgoing requests are always built from the *parsed* handle or file
 * key against a fixed provider host, so user input can never steer a request to
 * another host.
 */

export type ProfileLinkKind = 'github' | 'figma' | 'linkedin' | 'website';

export type LinkStatus =
  | 'idle' // nothing to check
  | 'checking' // request in flight (client only)
  | 'verified' // provider confirmed the profile / file exists
  | 'unverified' // well-formed, but the provider could not confirm it
  | 'invalid' // not a valid link for this provider
  | 'error'; // provider unreachable / rate limited

export interface GithubProfileSummary {
  login: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
}

export interface FigmaResourceSummary {
  title: string | null;
  thumbnailUrl: string | null;
}

export interface LinkVerification {
  kind: ProfileLinkKind;
  status: LinkStatus;
  message?: string;
  /** Canonical URL for the link when it parsed successfully. */
  url?: string;
  github?: GithubProfileSummary;
  figma?: FigmaResourceSummary;
}

export type ParsedProfileLink =
  | { ok: true; kind: ProfileLinkKind; url: string; handle: string; resource?: 'file' | 'profile' }
  | { ok: false; kind: ProfileLinkKind; reason: string };

const GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);
const FIGMA_HOSTS = new Set(['figma.com', 'www.figma.com']);
const LINKEDIN_HOSTS = new Set(['linkedin.com', 'www.linkedin.com']);

/** github.com/<name> paths that are site sections, not user profiles. */
const GITHUB_RESERVED = new Set([
  'about', 'apps', 'collections', 'contact', 'events', 'explore', 'features', 'issues',
  'join', 'login', 'marketplace', 'new', 'notifications', 'orgs', 'organizations', 'pricing',
  'pulls', 'search', 'security', 'settings', 'sponsors', 'topics', 'trending',
]);
const GITHUB_USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const FIGMA_FILE_KEY = /^[A-Za-z0-9]{10,40}$/;
const FIGMA_FILE_SEGMENTS = new Set(['file', 'design', 'proto', 'board', 'slides', 'make']);

export function isProfileLinkKind(value: unknown): value is ProfileLinkKind {
  return value === 'github' || value === 'figma' || value === 'linkedin' || value === 'website';
}

function toUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function fail(kind: ProfileLinkKind, reason: string): ParsedProfileLink {
  return { ok: false, kind, reason };
}

export function parseProfileLink(kind: ProfileLinkKind, raw: string): ParsedProfileLink {
  const url = toUrl(raw);
  if (!url) return fail(kind, 'Enter a full URL starting with https://');
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  switch (kind) {
    case 'github': {
      if (!GITHUB_HOSTS.has(host)) return fail(kind, 'Use a github.com profile link');
      const handle = segments[0];
      if (!handle || GITHUB_RESERVED.has(handle.toLowerCase()) || !GITHUB_USERNAME.test(handle)) {
        return fail(kind, 'Link must point to a GitHub user, e.g. https://github.com/octocat');
      }
      return { ok: true, kind, handle, resource: 'profile', url: `https://github.com/${handle}` };
    }

    case 'figma': {
      if (!FIGMA_HOSTS.has(host)) return fail(kind, 'Use a figma.com file or profile link');
      const [first, second] = segments;
      if (first?.startsWith('@') && first.length > 1) {
        return { ok: true, kind, handle: first.slice(1), resource: 'profile', url: `https://www.figma.com/${first}` };
      }
      if (first && FIGMA_FILE_SEGMENTS.has(first) && second && FIGMA_FILE_KEY.test(second)) {
        // Keep the full path so oEmbed can resolve titles / thumbnails.
        return { ok: true, kind, handle: second, resource: 'file', url: `https://www.figma.com${url.pathname}` };
      }
      return fail(kind, 'Link must be a Figma file (figma.com/design/...) or profile (figma.com/@name)');
    }

    case 'linkedin': {
      if (!LINKEDIN_HOSTS.has(host)) return fail(kind, 'Use a linkedin.com/in/... link');
      if (segments[0] !== 'in' || !segments[1]) return fail(kind, 'Link must look like linkedin.com/in/your-name');
      return { ok: true, kind, handle: segments[1], resource: 'profile', url: `https://www.linkedin.com/in/${segments[1]}` };
    }

    case 'website': {
      if (!host.includes('.') || host.startsWith('.') || host.endsWith('.')) return fail(kind, 'Enter a valid website address');
      return { ok: true, kind, handle: host, url: url.origin + (url.pathname === '/' ? '' : url.pathname) };
    }
  }
}

// ─── Server-side verification ────────────────────────────────────────────────

type FetchLike = typeof fetch;

export interface VerifyOptions {
  fetchImpl?: FetchLike;
  githubToken?: string;
  /** Seconds the Next.js data cache may reuse a provider response. */
  revalidate?: number;
}

export async function fetchGithubProfile(
  username: string,
  { fetchImpl = fetch, githubToken, revalidate = 300 }: VerifyOptions = {},
): Promise<{ status: 'ok'; profile: GithubProfileSummary } | { status: 'not_found' | 'error'; message: string }> {
  try {
    const res = await fetchImpl(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'tamgora-profile-verifier',
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
      },
      next: { revalidate },
      signal: AbortSignal.timeout(5000),
    } as RequestInit);

    if (res.status === 404) return { status: 'not_found', message: `No GitHub user named "${username}"` };
    if (!res.ok) {
      return { status: 'error', message: res.status === 403 || res.status === 429 ? 'GitHub rate limit reached, try again shortly' : 'GitHub is unavailable right now' };
    }
    const data = await res.json();
    return {
      status: 'ok',
      profile: {
        login: data.login,
        name: data.name ?? null,
        bio: data.bio ?? null,
        avatarUrl: data.avatar_url,
        htmlUrl: data.html_url,
        publicRepos: data.public_repos ?? 0,
        followers: data.followers ?? 0,
        following: data.following ?? 0,
      },
    };
  } catch {
    return { status: 'error', message: 'Could not reach GitHub' };
  }
}

async function fetchFigmaResource(
  url: string,
  { fetchImpl = fetch, revalidate = 300 }: VerifyOptions,
): Promise<{ status: 'ok'; resource: FigmaResourceSummary } | { status: 'not_found' | 'error'; message: string }> {
  try {
    const res = await fetchImpl(`https://www.figma.com/api/oembed?url=${encodeURIComponent(url)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'tamgora-profile-verifier' },
      next: { revalidate },
      signal: AbortSignal.timeout(5000),
    } as RequestInit);
    if (res.status === 404 || res.status === 403 || res.status === 400) {
      return { status: 'not_found', message: 'Figma could not find a public file at this link' };
    }
    if (!res.ok) return { status: 'error', message: 'Figma is unavailable right now' };
    const data = await res.json();
    return { status: 'ok', resource: { title: data.title ?? null, thumbnailUrl: data.thumbnail_url ?? null } };
  } catch {
    return { status: 'error', message: 'Could not reach Figma' };
  }
}

/**
 * Verify a profile link end to end. Only GitHub and Figma are checked against
 * the provider; LinkedIn and websites are format-validated and reported as
 * `unverified` (we deliberately do not fetch arbitrary user-supplied hosts).
 */
export async function verifyProfileLink(
  kind: ProfileLinkKind,
  raw: string,
  options: VerifyOptions = {},
): Promise<LinkVerification> {
  if (!raw.trim()) return { kind, status: 'idle' };

  const parsed = parseProfileLink(kind, raw);
  if (!parsed.ok) return { kind, status: 'invalid', message: parsed.reason };

  if (kind === 'github') {
    const result = await fetchGithubProfile(parsed.handle, options);
    if (result.status === 'ok') {
      return { kind, status: 'verified', url: parsed.url, github: result.profile, message: `Verified as @${result.profile.login}` };
    }
    return { kind, status: result.status === 'not_found' ? 'unverified' : 'error', url: parsed.url, message: result.message };
  }

  if (kind === 'figma' && parsed.resource === 'file') {
    const result = await fetchFigmaResource(parsed.url, options);
    if (result.status === 'ok') {
      return { kind, status: 'verified', url: parsed.url, figma: result.resource, message: result.resource.title ?? 'Public Figma file' };
    }
    return { kind, status: result.status === 'not_found' ? 'unverified' : 'error', url: parsed.url, message: result.message };
  }

  return {
    kind,
    status: 'unverified',
    url: parsed.url,
    message: kind === 'figma' ? 'Figma profile links cannot be checked automatically' : 'Link format looks valid',
  };
}
