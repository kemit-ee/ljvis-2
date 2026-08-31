import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, StatusBadge } from '@tedi-design-system/react/tedi';
import { useNotificationCount } from './useNotifications';
import styles from './NotificationBellButton.module.css';

export function NotificationBellButton(): React.ReactElement {
  const { unreadCount } = useNotificationCount();
  const navigate = useNavigate();

  return (
    <div className={styles.wrapper}>
      <Button
        visualType="link"
        onClick={() => navigate('/notifications')}
        aria-label={`Teavitused${unreadCount > 0 ? ` (${unreadCount} lugemata)` : ''}`}
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
