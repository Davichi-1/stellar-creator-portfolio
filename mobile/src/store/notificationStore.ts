/**
 * In-app notification store.
 *
 * Issue #1352 — "Initialize Mobile State Management with Zustand":
 * Manages the in-app notification inbox: adding incoming notifications,
 * marking them read, dismissing, and tracking the unread badge count.
 *
 * Notifications are persisted to AsyncStorage (capped at the 50 most recent)
 * so the inbox survives app restarts without a server round trip.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { InAppNotification, NotificationState } from './types';

export const NOTIFICATION_STORAGE_KEY = '@tamgora/notifications';

/** Maximum number of notifications retained in storage. */
const MAX_STORED = 50;

/** Derive the unread count from a notification list. */
function countUnread(items: InAppNotification[]): number {
  return items.filter((n) => !n.read).length;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,

      addNotifications: (incoming) =>
        set((state) => {
          // Deduplicate by ID and prepend new items
          const existingIds = new Set(state.notifications.map((n) => n.id));
          const fresh = incoming.filter((n) => !existingIds.has(n.id));
          const merged = [...fresh, ...state.notifications].slice(0, MAX_STORED);
          return { notifications: merged, unreadCount: countUnread(merged) };
        }),

      markRead: (id) =>
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          );
          return { notifications, unreadCount: countUnread(notifications) };
        }),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      dismiss: (id) =>
        set((state) => {
          const notifications = state.notifications.filter((n) => n.id !== id);
          return { notifications, unreadCount: countUnread(notifications) };
        }),

      clearAll: () => set({ notifications: [], unreadCount: 0 }),

      setLoading: (value) => set({ isLoading: value }),
    }),
    {
      name: NOTIFICATION_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    },
  ),
);
