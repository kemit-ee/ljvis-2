import React from 'react';
import {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './api';
import { subscribeToNotificationUpdates, notifyListeners } from './notificationSocket';
import type { InAppNotification, UnreadCountResult } from './types';

// Fallback-polling intervall, kui WS ei ole saadaval (proxy, võrk, loobutud
// pärast korduvaid ebaõnnestumisi). WS-i töötades pole seda vaja, aga hoiame
// alati käigus — arv on väike päring ja tagab, et badge ei jää kunagi kinni.
const FALLBACK_POLL_MS = 60_000;

// --------------------------------------------------------------------------
// useNotificationCount — kerge hook kelluke-badge jaoks
// --------------------------------------------------------------------------
export function useNotificationCount(): {
  unreadCount: number;
  refetch: () => void;
} {
  const [unreadCount, setUnreadCount] = React.useState(0);

  const refetch = React.useCallback(() => {
    fetchUnreadCount()
      .then((r: UnreadCountResult) => setUnreadCount(r.unreadCount ?? 0))
      .catch(() => {/* viga ei peata renderdust */});
  }, []);

  React.useEffect(() => {
    refetch(); // esmane laadimine
    // Jagatud WS-singleton annab märku serveri-poolsest muutusest.
    const unsubscribe = subscribeToNotificationUpdates(refetch);
    const poll = setInterval(refetch, FALLBACK_POLL_MS);
    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [refetch]);

  return { unreadCount, refetch };
}

// --------------------------------------------------------------------------
// useNotifications — täielik hook NotificationsPage jaoks
// --------------------------------------------------------------------------
export const NOTIFICATIONS_PAGE_SIZE = 20;

export function useNotifications(): {
  notifications: InAppNotification[];
  unreadCount: number;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refetch: () => void;
} {
  const [notifications, setNotifications] = React.useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  const refetch = React.useCallback(async () => {
    try {
      const [notifs, countRes] = await Promise.all([
        fetchNotifications(page, NOTIFICATIONS_PAGE_SIZE),
        fetchUnreadCount(),
      ]);
      setNotifications(notifs ?? []);
      setTotal(notifs?.[0]?.total ?? 0);
      setUnreadCount(countRes.unreadCount ?? 0);
    } catch {/* viga ei peata renderdust */} finally {
      setLoading(false);
    }
  }, [page]);

  React.useEffect(() => {
    void refetch();
    const unsubscribe = subscribeToNotificationUpdates(() => void refetch());
    return unsubscribe;
  }, [refetch]);

  const markRead = React.useCallback(
    async (id: string) => {
      await markNotificationRead(id);
      await refetch();
      notifyListeners();
    },
    [refetch],
  );

  const markAllRead = React.useCallback(async () => {
    await markAllNotificationsRead();
    await refetch();
    notifyListeners();
  }, [refetch]);

  const totalPages = Math.max(1, Math.ceil(total / NOTIFICATIONS_PAGE_SIZE));

  return { notifications, unreadCount, page, totalPages, setPage, loading, markRead, markAllRead, refetch };
}
