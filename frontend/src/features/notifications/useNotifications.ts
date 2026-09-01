import React from 'react';
import {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './api';
import { subscribeToNotificationUpdates } from './notificationSocket';
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
      .then((r: UnreadCountResult) => setUnreadCount(r.unread_count ?? 0))
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
export function useNotifications(): {
  notifications: InAppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refetch: () => void;
} {
  const [notifications, setNotifications] = React.useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const refetch = React.useCallback(async () => {
    try {
      const [notifs, countRes] = await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
      setNotifications(notifs ?? []);
      setUnreadCount(countRes.unread_count ?? 0);
    } catch {/* viga ei peata renderdust */} finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refetch();
    const unsubscribe = subscribeToNotificationUpdates(() => void refetch());
    return unsubscribe;
  }, [refetch]);

  const markRead = React.useCallback(
    async (id: string) => {
      await markNotificationRead(id);
      await refetch();
    },
    [refetch],
  );

  const markAllRead = React.useCallback(async () => {
    await markAllNotificationsRead();
    await refetch();
  }, [refetch]);

  return { notifications, unreadCount, loading, markRead, markAllRead, refetch };
}
