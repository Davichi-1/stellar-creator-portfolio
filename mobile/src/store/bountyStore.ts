/**
 * Bounty store.
 *
 * Issue #1352 — "Initialize Mobile State Management with Zustand":
 * Manages the bounty list, detail selection, active filters, and fetch state.
 * Persists the bounty list and filter preferences to AsyncStorage so the last
 * known list is available offline immediately on app launch.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Bounty, BountyFilters, BountyState } from './types';

export const BOUNTY_STORAGE_KEY = '@tamgora/bounties';

const INITIAL_FILTERS: BountyFilters = {};

export const useBountyStore = create<BountyState>()(
  persist(
    (set, get) => ({
      bounties: [],
      selectedBounty: null,
      filters: INITIAL_FILTERS,
      isLoading: false,
      error: null,
      lastFetchedAt: null,

      setBounties: (bounties) =>
        set({ bounties, lastFetchedAt: new Date().toISOString(), error: null }),

      upsertBounty: (bounty) =>
        set((state) => {
          const exists = state.bounties.some((b) => b.id === bounty.id);
          return {
            bounties: exists
              ? state.bounties.map((b) => (b.id === bounty.id ? bounty : b))
              : [bounty, ...state.bounties],
          };
        }),

      removeBounty: (id) =>
        set((state) => ({
          bounties: state.bounties.filter((b) => b.id !== id),
          selectedBounty:
            state.selectedBounty?.id === id ? null : state.selectedBounty,
        })),

      selectBounty: (bounty) => set({ selectedBounty: bounty }),

      setFilters: (partial) =>
        set((state) => ({ filters: { ...state.filters, ...partial } })),

      clearFilters: () => set({ filters: INITIAL_FILTERS }),

      setLoading: (value) => set({ isLoading: value }),

      setError: (error) => set({ error }),
    }),
    {
      name: BOUNTY_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the list and filters — loading/error/selection are transient
      partialize: (state) => ({
        bounties: state.bounties,
        filters: state.filters,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);
