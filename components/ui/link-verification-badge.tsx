'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, CircleSlash, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LinkVerification } from '@/lib/profile-links';

/** Visible label for a verification result. */
export function verificationLabel(v: Pick<LinkVerification, 'kind' | 'status'>): string {
  switch (v.status) {
    case 'verified':
      return 'Verified';
    case 'checking':
      return 'Checking...';
    case 'invalid':
      return 'Invalid link';
    case 'error':
      return "Can't check";
    case 'unverified':
      // LinkedIn / websites are never confirmed by a provider, only format-checked.
      return v.kind === 'website' || v.kind === 'linkedin' ? 'Linked' : 'Unverified';
    default:
      return 'Missing';
  }
}

const STYLES: Record<LinkVerification['status'], string> = {
  idle: 'text-muted-foreground',
  checking: 'text-muted-foreground',
  verified: 'text-emerald-600 dark:text-emerald-400',
  unverified: 'text-amber-600 dark:text-amber-400',
  invalid: 'text-destructive',
  error: 'text-amber-600 dark:text-amber-400',
};

function StatusIcon({ status }: { status: LinkVerification['status'] }) {
  const props = { size: 14, 'aria-hidden': true } as const;
  if (status === 'verified') return <CheckCircle2 {...props} />;
  if (status === 'checking') return <Loader2 {...props} className="animate-spin" />;
  if (status === 'idle') return <CircleSlash {...props} />;
  return <CircleAlert {...props} />;
}

interface Props {
  verification: LinkVerification;
  /** Hide the badge entirely while the field is empty (form usage). */
  hideWhenIdle?: boolean;
  className?: string;
}

export function LinkVerificationBadge({ verification, hideWhenIdle = false, className }: Props) {
  const { status, message } = verification;
  if (hideWhenIdle && status === 'idle') return null;

  return (
    <span
      role="status"
      aria-live="polite"
      data-status={status}
      title={message}
      className={cn('inline-flex items-center gap-1 text-xs font-medium', STYLES[status], className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          className="inline-flex items-center gap-1"
          initial={{ opacity: 0, scale: 0.85, y: 2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.15 }}
        >
          <StatusIcon status={status} />
          {verificationLabel(verification)}
        </motion.span>
      </AnimatePresence>
      {message && status !== 'verified' && status !== 'checking' && (
        <span className="font-normal text-muted-foreground">- {message}</span>
      )}
    </span>
  );
}
