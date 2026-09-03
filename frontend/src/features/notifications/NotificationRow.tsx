import { useTranslation } from 'react-i18next';
import { Button, StatusBadge, Text } from '@tedi-design-system/react/tedi';
import { formatDateTime } from '../../hooks/dateUtils';
import type { InAppNotification } from './types';
import styles from './NotificationRow.module.css';

interface NotificationRowProps {
  notif: InAppNotification;
  onMarkRead: (id: string) => void;
}

/** Üks in-app teavitus (UC-05). Lugemata teavitus on sinise vasakäärisega. */
export function NotificationRow({ notif, onMarkRead }: NotificationRowProps) {
  const { t } = useTranslation();
  const className = [
    styles.row,
    notif.isUnread ? styles.unread : styles.read,
  ].join(' ');

  return (
    <div className={className}>
      <div className={styles.body}>
        <div className={styles.titleLine}>
          <Text>{notif.titleEt}</Text>
          {notif.isUnread && (
            <StatusBadge color="warning">{t('notifications.unread')}</StatusBadge>
          )}
        </div>
        {notif.bodyEt && <Text>{notif.bodyEt}</Text>}
        <Text color="secondary">{formatDateTime(notif.createdAt)}</Text>
      </div>
      {notif.isUnread && (
        <Button
          visualType="secondary"
          size="small"
          onClick={() => onMarkRead(notif.id)}
        >
          {t('notifications.read')}
        </Button>
      )}
    </div>
  );
}
