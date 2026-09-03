import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Tabs, Text } from '@tedi-design-system/react/tedi';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from './useNotifications';
import { NotificationRow } from './NotificationRow';
import { OutboundLogTable } from './OutboundLogTable';
import { PERMISSIONS } from '../../constants/constants';
import styles from './NotificationsPage.module.css';

export function NotificationsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { notifications, loading, markRead, markAllRead } = useNotifications();

  const isAdmin = hasPermission(PERMISSIONS.NOTIFICATION_ADMIN);
  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">{t('notifications.title')}</Heading>
          </div>

          <Tabs>
            <Tabs.List>
              <Tabs.Trigger id="inapp">{t('notifications.tabInApp')}</Tabs.Trigger>
              {isAdmin && (
                <Tabs.Trigger id="outbound">{t('notifications.tabLog')}</Tabs.Trigger>
              )}
            </Tabs.List>

            <Tabs.Content id="inapp">
              {loading ? (
                <Text>{t('common.loading')}</Text>
              ) : (
                <div className={styles.list}>
                  {unreadCount > 0 && (
                    <div className={styles.toolbar}>
                      <Button
                        visualType="secondary"
                        onClick={() => void markAllRead()}
                      >
                        {t('notifications.markAllRead')}
                      </Button>
                    </div>
                  )}

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
                </div>
              )}
            </Tabs.Content>

            {isAdmin && (
              <Tabs.Content id="outbound">
                <OutboundLogTable />
              </Tabs.Content>
            )}
          </Tabs>
        </Card.Content>
      </Card>
    </div>
  );
}
