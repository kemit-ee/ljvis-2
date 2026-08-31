import React from 'react';
import {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './api';
import type { InAppNotification, UnreadCountResult } from './types';

// WebSocket endpoint — sama host mis Ruuter API, protokoll ws:// (dev) / wss:// (prod)
function buildWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  // dev proxy: vite ei proxyi ws:// automaatselt; vajalik Ruuter host otseselt
  // toodangus: sama host, nginx teeb upgrade
  return `${proto}//${host.replace('3001', '8086')}/ljvis/notifications/connect`;
}

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

  // WebSocket ühendus — reaalajas push notification_update sündmusel
  React.useEffect(() => {
    let ws: WebSocket | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    refetch(); // esmane laadimine

    function connect() {
      if (dead) return;
      try {
        ws = new WebSocket(buildWsUrl());

        ws.onopen = () => {
          // WS ühendus avatud — peatame fallback polling-u
          if (fallbackTimer) {
            clearInterval(fallbackTimer);
            fallbackTimer = null;
          }
        };

        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data as string);
            if (msg.type === 'notification_update') {
              refetch();
            }
          } catch {/* mitteJSON frame — ignoreerime */}
        };

        ws.onerror = () => {/* reconnect toimub onclose kaudu */};

        ws.onclose = () => {
          if (dead) return;
          // WS katkestus — aktiveeri fallback polling + planeeri reconnect
          if (!fallbackTimer) {
            fallbackTimer = setInterval(refetch, 60_000);
          }
          reconnectTimer = setTimeout(connect, 5_000);
        };
      } catch {
        // WebSocket konstruktori viga (nt SSR) — kasuta ainult fallback
        if (!fallbackTimer) {
          fallbackTimer = setInterval(refetch, 60_000);
        }
      }
    }

    connect();

    return () => {
      dead = true;
      if (ws) { try { ws.close(); } catch {/* ignore */} }
      if (fallbackTimer) clearInterval(fallbackTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
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
