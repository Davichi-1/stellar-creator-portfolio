// Server component: resolves a linked public Figma file through Figma's oEmbed endpoint.
import React from 'react';
import Image from 'next/image';
import { LinkCard } from '@/components/profile/link-card';
import { parseProfileLink, verifyProfileLink } from '@/lib/profile-links';

export default async function FigmaProfile({ url }: { url?: string }) {
    if (!url) return null;
    const parsed = parseProfileLink('figma', url);
    if (!parsed.ok) return null;

    const verification = await verifyProfileLink('figma', url);
    const title = verification.figma?.title ?? (parsed.resource === 'profile' ? `@${parsed.handle}` : 'Figma file');
    const thumbnail = verification.figma?.thumbnailUrl;

    return (
        <LinkCard
            href={parsed.url}
            provider="Figma"
            title={title}
            subtitle={parsed.resource === 'profile' ? 'Figma profile' : null}
            verification={verification}
            media={
                thumbnail ? (
                    // Thumbnails come from Figma's CDN; skip the image optimizer allow-list.
                    <Image
                        src={thumbnail}
                        alt={`${title} preview`}
                        width={96}
                        height={64}
                        unoptimized
                        className="h-16 w-24 shrink-0 rounded-md object-cover"
                    />
                ) : null
            }
        />
    );
}
