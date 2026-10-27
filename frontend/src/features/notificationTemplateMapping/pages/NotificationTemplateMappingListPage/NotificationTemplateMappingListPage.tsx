import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Card, Heading, StatusBadge, Text } from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import { PERMISSIONS } from '../../../../constants/constants';
import { listNotificationTemplateMappings, resolveDesktopRecipientUsers } from '../../api';
import type { NotificationTemplateMapping } from '../../types';
import { AppTable } from '../../../../shared/components/AppTable';

const columnHelper = createColumnHelper<NotificationTemplateMapping>();

export function NotificationTemplateMappingListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const forbidden = !hasPermission(
    PERMISSIONS.NOTIFICATION_TEMPLATE_MAPPING_LIST,
  );

  const [data, setData] = useState<NotificationTemplateMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recipientNames, setRecipientNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (forbidden) return;
    let cancelled = false;
    setIsLoading(true);
    listNotificationTemplateMappings()
      .then((res) => {
        if (cancelled) return;
        setData(res);
        const codes = Array.from(
          new Set(res.flatMap((m) => m.desktopRecipientPersonalCodes ?? [])),
        );
        if (codes.length === 0) return;
        resolveDesktopRecipientUsers(codes).then((users) => {
          if (cancelled) return;
          setRecipientNames(
            Object.fromEntries(
              users.map((u) => [u.personalCode, `${u.firstName} ${u.lastName}`]),
            ),
          );
        });
      })
      .catch((e) => console.error('Failed to load notification template mappings', e))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [forbidden]);

  const handleRowClick = useCallback(
    (row: NotificationTemplateMapping) => {
      navigate(`/notification-template-mapping/${row.notificationType}`);
    },
    [navigate],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('notificationType', {
        id: 'notificationTypeName',
        header: t('notificationTemplateMapping.notificationTypeName'),
        cell: (info) =>
          t(`notifications.types.${info.getValue()}`, info.getValue()),
      }),
      columnHelper.accessor('notificationType', {
        header: t('notificationTemplateMapping.notificationType'),
      }),
      columnHelper.accessor('channel', {
        header: t('notificationTemplateMapping.channel'),
      }),
      columnHelper.accessor('originalTemplateId', {
        header: t('notificationTemplateMapping.originalTemplateId'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.display({
        id: 'recipients',
        header: t('notificationTemplateMapping.recipients'),
        cell: (info) => {
          const mapping = info.row.original;
          if (mapping.channel === 'desktop') {
            const names = (mapping.desktopRecipientPersonalCodes ?? []).map(
              (code) => recipientNames[code] ?? code,
            );
            return names.length > 0 ? names.join(', ') : '—';
          }
          return mapping.defaultRecipientEmail || '—';
        },
      }),
      columnHelper.accessor('active', {
        header: t('notificationTemplateMapping.active'),
        cell: (info) => {
          const isActive = info.getValue();
          return (
            <StatusBadge
              variant="filled-bordered"
              color={isActive ? 'success' : 'neutral'}
            >
              {isActive
                ? t('notificationTemplateMapping.statusActive')
                : t('notificationTemplateMapping.statusInactive')}
            </StatusBadge>
          );
        },
      }),
      columnHelper.display({
        id: 'viewDetails',
        header: '',
        cell: (info) => (
          <div className="cell-center">
            <a
              href={`/notification-template-mapping/${info.row.original.notificationType}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRowClick(info.row.original);
              }}
              className="table-link"
            >
              {t('notificationTemplateMapping.viewDetails')}
            </a>
          </div>
        ),
      }),
    ],
    [t, handleRowClick, recipientNames],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">{t('notificationTemplateMapping.title')}</Heading>
          </div>
          <AppTable
            id="notification-template-mapping-table"
            data={data}
            columns={columns}
            isLoading={isLoading}
            hidePagination
            placeholder={t('common.tableIsEmpty')}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
