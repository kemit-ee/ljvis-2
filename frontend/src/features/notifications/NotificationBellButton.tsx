import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Icon, StatusBadge } from '@tedi-design-system/react/tedi';
import { useNotificationCount } from './useNotifications';
import styles from './NotificationBellButton.module.css';

export function NotificationBellButton(): React.ReactElement {
  const { unreadCount } = useNotificationCount();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className={styles.wrapper}>
      <Button
        visualType="link"
        onClick={() => navigate('/notifications')}
        aria-label={
          unreadCount > 0
            ? t('notifications.bellAriaLabel', { count: unreadCount })
            : t('notifications.bellAriaLabelEmpty')
        }
      >
        <Icon name="notifications" />
      </Button>
      {unreadCount > 0 && (
        <span className={styles.badge}>
          <StatusBadge color="danger">
            {unreadCount > 99 ? '99+' : String(unreadCount)}
          </StatusBadge>
        </span>
      )}
    </div>
  );
}
