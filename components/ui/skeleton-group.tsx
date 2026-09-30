import { CardSkeleton, BountySkeleton, TextSkeleton } from '@/components/skeletons/card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton for a full creator profile page */
export function CreatorProfileSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Cover */}
      <div className="h-48 sm:h-64 bg-muted w-full" />
      {/* Avatar + name */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end gap-4 -mt-12 mb-6">
          <div className="w-24 h-24 rounded-full bg-muted border-4 border-background" />
          <div className="pb-2 space-y-2 flex-1">
            <div className="h-7 bg-muted rounded w-48" />
            <div className="h-4 bg-muted rounded w-32" />
          </div>
        </div>
        {/* Bio */}
        <TextSkeleton lines={3} />
        {/* Skills */}
        <div className="flex gap-2 mt-6 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 bg-muted rounded-full w-20" />
          ))}
        </div>
        {/* Projects grid */}
        <div className="mt-10">
          <div className="h-6 bg-muted rounded w-40 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for the bounties listing page */
export function BountiesPageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      {/* Header */}
      <div className="h-10 bg-muted rounded w-64 mb-3" />
      <div className="h-5 bg-muted rounded w-96 mb-10" />
      {/* Filter bar */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted rounded-full w-24" />
        ))}
      </div>
      {/* Bounty cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => <BountySkeleton key={i} />)}
      </div>
    </div>
  );
}

/** Skeleton for admin analytics metric section */
export function AnalyticsMetricsSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for an analytics list section */
export function AnalyticsListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-5 bg-muted rounded w-36 mb-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 bg-muted rounded" />
      ))}
    </div>
  );
}

/** Skeleton for a user table row */
export function UserTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {/* Filters bar */}
      <div className="flex gap-3 mb-4">
        <div className="h-9 bg-muted rounded w-60" />
        <div className="h-9 bg-muted rounded w-32" />
        <div className="h-9 bg-muted rounded w-32" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-muted rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Skeleton for the API keys dashboard.
 *
 * Mirrors the real layout — the "Create API key" form above, the key list
 * below — so the page does not reflow when the data arrives.
 */
export function ApiKeysSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-8" role="status" aria-busy="true">
      {/* Create API key form */}
      <section className="rounded-lg border p-6 space-y-4">
        <div className="h-6 bg-muted rounded w-40" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-16" />
          <div className="h-10 bg-muted rounded w-full" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-20" />
          <div className="flex gap-4">
            <div className="h-6 bg-muted rounded w-28" />
            <div className="h-6 bg-muted rounded w-32" />
          </div>
        </div>
        <div className="h-10 bg-muted rounded w-36" />
      </section>

      {/* Existing keys */}
      <section className="space-y-4">
        <div className="h-6 bg-muted rounded w-36" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border p-4 flex items-center justify-between gap-4"
          >
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-8 bg-muted rounded w-20 shrink-0" />
          </div>
        ))}
      </section>

      <span className="sr-only">Loading API keys…</span>
    </div>
  );
}

/** Skeleton for the IPFS file browser */
export function FileBrowserSkeleton() {
  return (
    <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
      <div className="h-8 bg-muted rounded w-48 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for one aggregated external-profile card (GitHub / Figma / website) */
export function LinkCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-lg border bg-card p-4 flex items-start gap-4"
      role="status"
      aria-busy="true"
      aria-label="Loading linked profile"
    >
      <div className="h-16 w-16 shrink-0 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-muted rounded w-16" />
        <div className="h-5 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

/** Skeleton for the profile portfolio widget: mirrors its 1 / 2 column grid */
export function PortfolioWidgetSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: cards }).map((_, i) => (
        <LinkCardSkeleton key={i} />
      ))}
    </div>
  );
}
