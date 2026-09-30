// Server component: fetches public GitHub profile data for a linked account.
import React from 'react';
import Image from 'next/image';
import { LinkCard } from '@/components/profile/link-card';
import { fetchGithubProfile, parseProfileLink } from '@/lib/profile-links';

type Props = { username?: string; url?: string };

/**
 * Renders the linked GitHub account (avatar, bio, repo / follower counts).
 * Pass either a `username` or a full profile `url`; the URL is parsed and
 * validated before any request is made.
 */
export default async function GithubProfile({ username, url }: Props) {
    const parsed = url ? parseProfileLink('github', url) : null;
    const login = username ?? (parsed?.ok ? parsed.handle : null);
    if (!login) return null;

    const result = await fetchGithubProfile(login, { githubToken: process.env.GITHUB_TOKEN });

    if (result.status !== 'ok') {
        return (
            <div className="p-4 rounded-lg border bg-card text-sm text-muted-foreground" role="status">
                {result.status === 'not_found' ? result.message : 'Unable to fetch GitHub data right now.'}
            </div>
        );
    }

    const { profile } = result;
    return (
        <LinkCard
            href={profile.htmlUrl}
            provider="GitHub"
            title={profile.name || profile.login}
            subtitle={profile.bio}
            verification={{ kind: 'github', status: 'verified', message: `Verified as @${profile.login}` }}
            media={
                <Image
                    src={profile.avatarUrl}
                    alt={`${profile.login} avatar`}
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-full"
                />
            }
            stats={[
                { label: 'repos', value: profile.publicRepos },
                { label: 'followers', value: profile.followers },
                { label: 'following', value: profile.following },
            ]}
        />
    );
}
