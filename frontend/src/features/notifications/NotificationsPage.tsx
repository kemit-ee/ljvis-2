import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Heading,
  StatusBadge,
  Tabs,
  Text,
} from '@tedi-design-system/react/tedi';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from './useNotifications';
import { OutboundLogTable } from './OutboundLogTable';
import { PERMISSIONS } from '../../constants/constants';
import type { InAppNotification } from './types';

function NotificationRow({
  notif,
  onMarkRead,
}: {
  notif: InAppNotification;
  onMarkRead: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        padding: '12px 16px',
        marginBottom: '8px',
        border: '1px solid #e0e0e0',
        borderLeft: notif.is_unread ? '3px solid var(--color-primary, #0073e6)' : '3px solid transparent',
        borderRadius: '4px',
        opacity: notif.is_unread ? 1 : 0.7,
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
            <Text>{notif.title_et}</Text>
            {notif.is_unread && (
              <StatusBadge color="warning">{t('notifications.unread')}</StatusBadge>
            )}
          </div>
          {notif.body_et && <Text>{notif.body_et}</Text>}
          <Text color="secondary">
            {new Date(notif.created_at).toLocaleString('et-EE')}
          </Text>
        </div>
        {notif.is_unread && (
          <Button
            visualType="secondary"
            size="small"
            onClick={() => onMarkRead(notif.id)}
          >
            {t('notifications.read')}
          </Button>
        )}
      </div>
    </div>
  );
}

export function NotificationsPage(): React.ReactElement {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { notifications, loading, markRead, markAllRead } = useNotifications();

  const unreadCount = notifications.filter((n) => n.is_unread).length;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      <Heading element="h1">{t('notifications.title')}</Heading>

      <Tabs>
        <Tabs.List>
          <Tabs.Trigger id="inapp">{t('notifications.tabInApp')}</Tabs.Trigger>
          {hasPermission(PERMISSIONS.NOTIFICATION_ADMIN) && (
            <Tabs.Trigger id="outbound">{t('notifications.tabLog')}</Tabs.Trigger>
          )}
        </Tabs.List>

        <Tabs.Content id="inapp">
          {loading ? (
            <Text>{t('common.loading')}</Text>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: '16px',
                }}
              >
                {unreadCount > 0 && (
                  <Button visualType="secondary" onClick={() => void markAllRead()}>
                    {t('notifications.markAllRead')}
                  </Button>
                )}
              </div>

              {notifications.length === 0 ? (
                <Text>{t('notifications.empty')}</Text>
              ) : (
                notifications.map((notif) => (
                  <NotificationRow
                    key={notif.id}
                    notif={notif}
                    onMarkRead={(id) => void markRead(id)}
                  />
                ))
              )}
            </>
          )}
        </Tabs.Content>

        {hasPermission(PERMISSIONS.NOTIFICATION_ADMIN) && (
          <Tabs.Content id="outbound">
            <OutboundLogTable />
          </Tabs.Content>
        )}
      </Tabs>
    </div>
  );
}
