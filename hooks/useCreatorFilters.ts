'use client';

import { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

/**
 * URL-backed filter state for the creators directory.
 *
 * Filters live in the query string rather than React state so results are
 * shareable, bookmarkable and survive reloads. Default values are omitted
 * from the URL to keep it clean.
 *
 * | Filter            | Query param  | Default       |
 * | ----------------- | ------------ | ------------- |
 * | `query`           | `q`          | `''`          |
 * | `discipline`      | `discipline` | `'All'`       |
 * | `skills`          | `skills`     | `[]` (CSV)    |
 * | `experienceRange` | `exp`        | `'All'`       |
 * | `sort`            | `sort`       | `'relevance'` |
 */

/** Sort orders supported by the creators listing. */
export type SortOption = 'relevance' | 'most-reviewed' | 'highest-rated' | 'most-experienced';

/** Current filter selection, parsed from the URL search params. */
export interface CreatorFilters {
  query: string;
  discipline: string;
  skills: string[];
  experienceRange: string;
  sort: SortOption;
}

/**
 * Maps each `experienceRange` key to an inclusive `[min, max]` span of years.
 * `'10+'` uses 999 as an open-ended upper bound. `'All'` has no entry and
 * means "no experience filter".
 */
export const EXPERIENCE_RANGES: Record<string, [number, number]> = {
  '0-2':  [0, 2],
  '3-5':  [3, 5],
  '6-10': [6, 10],
  '10+':  [10, 999],
};

const DEFAULTS: CreatorFilters = {
  query: '',
  discipline: 'All',
  skills: [],
  experienceRange: 'All',
  sort: 'relevance',
};

/**
 * Reads and writes creator directory filters via the URL query string.
 *
 * Must be used in a client component rendered inside a `<Suspense>` boundary,
 * since it depends on `useSearchParams`.
 *
 * @returns
 * - `filters` — the current {@link CreatorFilters}, with defaults applied.
 * - `update(patch)` — merges `patch` into the current filters, writes them to
 *   the URL (dropping params that equal their default) and resets `page` to 1.
 *   Navigates with `router.push` without scrolling.
 * - `clear()` — removes every query param, restoring all defaults.
 * - `activeFilterCount` — number of filters differing from their default,
 *   e.g. for a "Filters (3)" badge.
 */
export function useCreatorFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: CreatorFilters = {
    query:           searchParams.get('q') ?? DEFAULTS.query,
    discipline:      searchParams.get('discipline') ?? DEFAULTS.discipline,
    skills:          searchParams.get('skills') ? searchParams.get('skills')!.split(',').filter(Boolean) : [],
    experienceRange: searchParams.get('exp') ?? DEFAULTS.experienceRange,
    sort:            (searchParams.get('sort') as SortOption) ?? DEFAULTS.sort,
  };

  const activeFilterCount = [
    filters.query !== '',
    filters.discipline !== 'All',
    filters.skills.length > 0,
    filters.experienceRange !== 'All',
    filters.sort !== 'relevance',
  ].filter(Boolean).length;

  const update = useCallback((patch: Partial<CreatorFilters>) => {
    const params = new URLSearchParams(searchParams.toString());
    const next = { ...filters, ...patch };

    if (next.query) { params.set('q', next.query); } else { params.delete('q'); }
    if (next.discipline !== 'All') { params.set('discipline', next.discipline); } else { params.delete('discipline'); }
    if (next.skills.length) { params.set('skills', next.skills.join(',')); } else { params.delete('skills'); }
    if (next.experienceRange !== 'All') { params.set('exp', next.experienceRange); } else { params.delete('exp'); }
    if (next.sort !== 'relevance') { params.set('sort', next.sort); } else { params.delete('sort'); }
    params.set('page', '1');

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [filters, pathname, router, searchParams]);

  const clear = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, update, clear, activeFilterCount };
}
