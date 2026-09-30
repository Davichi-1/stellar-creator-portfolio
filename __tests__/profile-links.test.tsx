import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { parseProfileLink, verifyProfileLink } from '@/lib/profile-links';
import { GET } from '@/app/api/profile/verify-link/route';
import { SocialLinks } from '@/components/ui/social-links';

const FIGMA_FILE = 'https://www.figma.com/design/AbCdEfGhIjKlMnOpQrStUv/My-Portfolio?node-id=0-1';

const githubResponse = {
  login: 'octocat',
  name: 'The Octocat',
  bio: 'Mascot',
  avatar_url: 'https://avatars.githubusercontent.com/u/583231',
  html_url: 'https://github.com/octocat',
  public_repos: 8,
  followers: 100,
  following: 9,
};

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseProfileLink', () => {
  it('extracts the GitHub handle and canonicalises the URL', () => {
    expect(parseProfileLink('github', 'https://github.com/octocat/Hello-World')).toMatchObject({
      ok: true,
      handle: 'octocat',
      url: 'https://github.com/octocat',
    });
  });

  it('rejects other hosts, reserved paths and malformed usernames for GitHub', () => {
    expect(parseProfileLink('github', 'https://gitlab.com/octocat').ok).toBe(false);
    expect(parseProfileLink('github', 'https://github.com.evil.example/octocat').ok).toBe(false);
    expect(parseProfileLink('github', 'https://github.com/settings/profile').ok).toBe(false);
    expect(parseProfileLink('github', 'https://github.com/-bad-').ok).toBe(false);
    expect(parseProfileLink('github', 'octocat').ok).toBe(false);
  });

  it('accepts Figma files and profiles, rejects everything else', () => {
    expect(parseProfileLink('figma', FIGMA_FILE)).toMatchObject({ ok: true, resource: 'file', handle: 'AbCdEfGhIjKlMnOpQrStUv' });
    expect(parseProfileLink('figma', 'https://www.figma.com/@jane')).toMatchObject({ ok: true, resource: 'profile', handle: 'jane' });
    expect(parseProfileLink('figma', 'https://www.figma.com/pricing').ok).toBe(false);
    expect(parseProfileLink('figma', 'https://figma.example.com/design/AbCdEfGhIjKlMnOpQrStUv').ok).toBe(false);
  });

  it('validates LinkedIn and website links', () => {
    expect(parseProfileLink('linkedin', 'https://www.linkedin.com/in/jane-doe/')).toMatchObject({ ok: true, handle: 'jane-doe' });
    expect(parseProfileLink('linkedin', 'https://www.linkedin.com/company/acme').ok).toBe(false);
    expect(parseProfileLink('website', 'https://jane.dev/portfolio')).toMatchObject({ ok: true, handle: 'jane.dev' });
    expect(parseProfileLink('website', 'https://localhost').ok).toBe(false);
  });
});

describe('verifyProfileLink', () => {
  it('marks an existing GitHub user as verified and returns profile data', async () => {
    const fetchImpl = vi.fn(() => json(githubResponse)) as unknown as typeof fetch;
    const result = await verifyProfileLink('github', 'https://github.com/octocat', { fetchImpl });
    expect(result.status).toBe('verified');
    expect(result.github).toMatchObject({ login: 'octocat', publicRepos: 8, followers: 100 });
    expect(vi.mocked(fetchImpl).mock.calls[0][0]).toBe('https://api.github.com/users/octocat');
  });

  it('reports unknown users as unverified and API trouble as error', async () => {
    const notFound = vi.fn(() => json({ message: 'Not Found' }, 404)) as unknown as typeof fetch;
    expect((await verifyProfileLink('github', 'https://github.com/nobody-here', { fetchImpl: notFound })).status).toBe('unverified');

    const limited = vi.fn(() => json({}, 403)) as unknown as typeof fetch;
    expect((await verifyProfileLink('github', 'https://github.com/octocat', { fetchImpl: limited })).status).toBe('error');

    const down = vi.fn(() => Promise.reject(new Error('network'))) as unknown as typeof fetch;
    expect((await verifyProfileLink('github', 'https://github.com/octocat', { fetchImpl: down })).status).toBe('error');
  });

  it('never calls the network for malformed links', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await verifyProfileLink('github', 'https://evil.example/octocat', { fetchImpl });
    expect(result.status).toBe('invalid');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('verifies a public Figma file through oEmbed', async () => {
    const fetchImpl = vi.fn(() => json({ title: 'My Portfolio', thumbnail_url: 'https://s3.figma.com/t.png' })) as unknown as typeof fetch;
    const result = await verifyProfileLink('figma', FIGMA_FILE, { fetchImpl });
    expect(result).toMatchObject({ status: 'verified', figma: { title: 'My Portfolio' } });
    expect(String(vi.mocked(fetchImpl).mock.calls[0][0])).toContain('https://www.figma.com/api/oembed?url=');
  });
});

describe('GET /api/profile/verify-link', () => {
  const call = (qs: string) => GET(new Request(`http://localhost/api/profile/verify-link?${qs}`));

  it('rejects unknown kinds', async () => {
    expect((await call('kind=myspace&url=x')).status).toBe(400);
  });

  it('returns a verification for a valid link', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json(githubResponse)));
    const res = await call(`kind=github&url=${encodeURIComponent('https://github.com/octocat')}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ kind: 'github', status: 'verified' });
  });
});

describe('SocialLinks', () => {
  it('shows real verification state instead of trusting any parseable URL', async () => {
    // The component talks to our own API, which answers with a LinkVerification.
    vi.stubGlobal('fetch', vi.fn(() => json({
      kind: 'github', status: 'verified', url: 'https://github.com/octocat', message: 'Verified as @octocat',
    })));
    render(<SocialLinks githubUrl="https://github.com/octocat" figmaUrl="https://example.com/nope" websiteUrl="https://jane.dev" />);

    // Local, instant results.
    expect(screen.getByText('Invalid link')).toBeInTheDocument();
    expect(screen.getByText('Linked')).toBeInTheDocument();
    // Remote result arrives after the debounce.
    expect(await screen.findByText('Verified', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/octocat');
  });
});
