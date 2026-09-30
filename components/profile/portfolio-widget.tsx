import React, { Suspense } from 'react';
import GithubProfile from '@/components/ui/github-profile';
import FigmaProfile from '@/components/ui/figma-profile';
import { LinkCard } from '@/components/profile/link-card';
import { LinkCardSkeleton } from '@/components/ui/skeleton-group';
import { parseProfileLink } from '@/lib/profile-links';

interface PortfolioWidgetProps {
  githubUrl?: string | null;
  figmaUrl?: string | null;
  websiteUrl?: string | null;
}

/**
 * Aggregates a creator's external profiles into one grid. Each card is its own
 * async server component behind its own Suspense boundary, so a slow GitHub or
 * Figma response streams in without blocking the rest of the page.
 */
export function PortfolioWidget({ githubUrl, figmaUrl, websiteUrl }: PortfolioWidgetProps) {
  const website = websiteUrl ? parseProfileLink('website', websiteUrl) : null;

  if (!githubUrl && !figmaUrl && !website?.ok) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Link your GitHub, Figma or website below to show them here.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {githubUrl && (
        <Suspense fallback={<LinkCardSkeleton />}>
          <GithubProfile url={githubUrl} />
        </Suspense>
      )}
      {figmaUrl && (
        <Suspense fallback={<LinkCardSkeleton />}>
          <FigmaProfile url={figmaUrl} />
        </Suspense>
      )}
      {website?.ok && (
        <LinkCard
          href={website.url}
          provider="Website"
          title={website.handle}
          subtitle={website.url}
          verification={{ kind: 'website', status: 'unverified', message: 'Link format looks valid' }}
        />
      )}
    </div>
  );
}
