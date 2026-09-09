import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, StatusBadge, Text } from '@tedi-design-system/react/tedi';
import { formatDateTime } from '../../hooks/dateUtils';
import type { InAppNotification } from './types';
import styles from './NotificationRow.module.css';

interface NotificationRowProps {
  notif: InAppNotification;
  onMarkRead: (id: string) => void;
}

/**
 * Kaardistab relatedEntityType → SPA-marsruut.
 * Tagastab null kui entity_type puudub või tundmatu.
 */
function getEntityUrl(
  type: string | null | undefined,
  id: string | null | undefined,
): string | null {
  if (!type || !id) return null;
  switch (type) {
    case 'drive_rest_driver_form':   return `/control-forms/sp-driver/${id}`;
    case 'drive_rest_teammate_form': return `/control-forms/sp-teammate/${id}`;
    case 'compound_form':            return `/control-forms/compound/${id}`;
    case 'tram_form':                return `/control-forms/tram-control-card/${id}`;
    case 'tram_control_card':        return `/control-forms/tram-control-card/${id}`;
    case 'vehicle_technical':        return `/control-forms/vehicle-technical/${id}`;
    case 'trailer_technical':        return `/control-forms/trailer-technical/${id}`;
    case 'foreign_violation_form':   return `/control-forms/foreign-violation/${id}`;
    case 'labour_inspection':        return `/control-forms/labour-inspection/${id}`;
    case 'good_repute':              return `/control-forms/good-repute/${id}`;
    case 'adr_form':                 return `/control-forms/adr/${id}`;
    case 'transport_interruption':   return `/control-forms/transport-interruption/${id}`;
    case 'ncr':                      return `/erru/ncr/${id}`;
    case 'rsi':                      return `/erru/rsi/${id}`;
    case 'ctud':                     return `/erru/ctud/${id}`;
    case 'cgr':                      return `/erru/cgr/${id}`;
    default:                         return null;
  }
}

/** Üks in-app teavitus (UC-05). Lugemata teavitus on sinise vasakäärisega. */
export function NotificationRow({ notif, onMarkRead }: NotificationRowProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const entityUrl = getEntityUrl(notif.relatedEntityType, notif.relatedEntityId);

  const className = [
    styles.row,
    notif.isUnread ? styles.unread : styles.read,
  ].join(' ');

  const handleOpen = () => {
    if (notif.isUnread) onMarkRead(notif.id);
    if (entityUrl) navigate(entityUrl);
  };

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
      <div className={styles.actions}>
        {entityUrl && (
          <Button
            visualType="primary"
            size="small"
            onClick={handleOpen}
          >
            {t('notifications.openEntity')}
          </Button>
        )}
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
    </div>
  );
}
