'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useLinkVerification } from '@/lib/hooks/use-link-verification';
import { LinkVerificationBadge } from '@/components/ui/link-verification-badge';
import type { ProfileLinkKind } from '@/lib/profile-links';
import { cn } from '@/lib/utils';

type Props = {
    githubUrl?: string;
    figmaUrl?: string;
    websiteUrl?: string;
    className?: string;
};

const LINKS: { key: string; kind: ProfileLinkKind; label: string; prop: 'githubUrl' | 'figmaUrl' | 'websiteUrl' }[] = [
    { key: 'github', kind: 'github', label: 'GitHub', prop: 'githubUrl' },
    { key: 'figma', kind: 'figma', label: 'Figma', prop: 'figmaUrl' },
    { key: 'website', kind: 'website', label: 'Website', prop: 'websiteUrl' },
];

function SocialLinkPill({ kind, label, url }: { kind: ProfileLinkKind; label: string; url?: string }) {
    const verification = useLinkVerification(kind, url);
    const href = verification.status === 'idle' || verification.status === 'invalid' ? undefined : verification.url;
    const classes = cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card/50 text-sm',
        !href && 'opacity-60',
    );
    const content = (
        <>
            <motion.span whileHover={{ rotate: 12 }} className="inline-flex" aria-hidden="true">
                <ExternalLink size={14} />
            </motion.span>
            <span>{label}</span>
            <LinkVerificationBadge verification={verification} />
        </>
    );

    if (!href) {
        return <span className={classes} aria-disabled="true">{content}</span>;
    }

    return (
        <motion.a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(classes, 'hover:border-primary/60 hover:shadow-sm')}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
            {content}
        </motion.a>
    );
}

export function SocialLinks({ githubUrl, figmaUrl, websiteUrl, className }: Props) {
    const urls = { githubUrl, figmaUrl, websiteUrl };
    return (
        <div className={cn('flex flex-wrap gap-3', className)}>
            {LINKS.map((l) => (
                <SocialLinkPill key={l.key} kind={l.kind} label={l.label} url={urls[l.prop]} />
            ))}
        </div>
    );
}

export default SocialLinks;
