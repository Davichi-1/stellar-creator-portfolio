'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { LinkVerificationBadge } from '@/components/ui/link-verification-badge';
import type { LinkVerification } from '@/lib/profile-links';

interface LinkCardProps {
  href: string;
  provider: string;
  title: string;
  subtitle?: string | null;
  verification: LinkVerification;
  /** Avatar / thumbnail slot rendered by the (server) parent. */
  media?: ReactNode;
  stats?: { label: string; value: number | string }[];
}

/**
 * Presentational card for one aggregated external profile. Client component
 * only so it can own the Framer Motion hover animation; the data is fetched by
 * server components in `portfolio-widget.tsx`.
 */
export function LinkCard({ href, provider, title, subtitle, verification, media, stats }: LinkCardProps) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      whileHover={{ y: -4, boxShadow: '0 10px 24px -12px rgba(0,0,0,0.35)' }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 350, damping: 24 }}
    >
      <div className="flex items-start gap-4">
        {media}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{provider}</span>
            <ArrowUpRight
              size={16}
              aria-hidden="true"
              className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
            />
          </div>
          <p className="truncate font-semibold text-foreground">{title}</p>
          {subtitle && <p className="line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>}
          {stats && stats.length > 0 && (
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {stats.map((s) => (
                <div key={s.label} className="flex gap-1">
                  <dd className="font-medium text-foreground">{s.value}</dd>
                  <dt>{s.label}</dt>
                </div>
              ))}
            </dl>
          )}
          <LinkVerificationBadge verification={verification} className="mt-2" />
        </div>
      </div>
    </motion.a>
  );
}
