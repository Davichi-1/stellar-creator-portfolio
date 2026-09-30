import { NextResponse } from 'next/server';
import { isProfileLinkKind, verifyProfileLink } from '@/lib/profile-links';

/**
 * GET /api/profile/verify-link?kind=github|figma|linkedin|website&url=...
 *
 * Returns a LinkVerification. Provider responses are cached for five minutes
 * by the Next.js data cache, so typing in the profile form does not hammer
 * GitHub / Figma.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind');
  const url = searchParams.get('url') ?? '';

  if (!isProfileLinkKind(kind)) {
    return NextResponse.json({ error: 'Unknown link kind' }, { status: 400 });
  }
  if (url.length > 2048) {
    return NextResponse.json({ error: 'URL too long' }, { status: 400 });
  }

  const result = await verifyProfileLink(kind, url, { githubToken: process.env.GITHUB_TOKEN });
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  });
}
