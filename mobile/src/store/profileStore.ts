/**
 * Profile store.
 *
 * Issue #1352 — "Initialize Mobile State Management with Zustand":
 * Manages the signed-in user's own profile, a cache of viewed creator
 * profiles, and their portfolio projects.  The own profile is persisted to
 * AsyncStorage so it renders immediately without waiting for a network round
 * trip.  Cached profiles are intentionally in-memory only to stay fresh.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CreatorProfile, PortfolioProject, ProfileState } from './types';

export const PROFILE_STORAGE_KEY = '@tamgora/own_profile';

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      ownProfile: null,
      profileCache: {},
      isLoading: false,
      isSaving: false,
      error: null,

      setOwnProfile: (profile) => set({ ownProfile: profile, error: null }),

      patchOwnProfile: (patch) =>
        set((state) => {
          if (!state.ownProfile) return state;
          return { ownProfile: { ...state.ownProfile, ...patch } };
        }),

      cacheProfile: (profile) =>
        set((state) => ({
          profileCache: { ...state.profileCache, [profile.userId]: profile },
        })),

      getCachedProfile: (userId) => get().profileCache[userId],

      upsertProject: (project: PortfolioProject) =>
        set((state) => {
          if (!state.ownProfile) return state;
          const exists = state.ownProfile.portfolioProjects.some(
            (p) => p.id === project.id,
          );
          const portfolioProjects = exists
            ? state.ownProfile.portfolioProjects.map((p) =>
                p.id === project.id ? project : p,
              )
            : [...state.ownProfile.portfolioProjects, project];
          return {
            ownProfile: { ...state.ownProfile, portfolioProjects },
          };
        }),

      removeProject: (projectId) =>
        set((state) => {
          if (!state.ownProfile) return state;
          return {
            ownProfile: {
              ...state.ownProfile,
              portfolioProjects: state.ownProfile.portfolioProjects.filter(
                (p) => p.id !== projectId,
              ),
            },
          };
        }),

      setLoading: (value) => set({ isLoading: value }),

      setSaving: (value) => set({ isSaving: value }),

      setError: (error) => set({ error }),
    }),
    {
      name: PROFILE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist own profile — profile cache is in-memory only
      partialize: (state) => ({ ownProfile: state.ownProfile }),
    },
  ),
);
