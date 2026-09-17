import { useTranslation } from 'react-i18next';
import { Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import { PERMISSIONS } from '../../../../constants/constants';
import { XroadLogTable } from '../../XroadLogTable';

/** Haldus > eToimiku X-tee logid — auditi/järelvalve vaade eToimiku päringute logile. */
export function XroadLogListPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  const forbidden = !hasPermission(PERMISSIONS.XROAD_LOG_READ);
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">{t('xroadLogs.title')}</Heading>
          </div>
          <XroadLogTable />
        </Card.Content>
      </Card>
    </div>
  );
}
