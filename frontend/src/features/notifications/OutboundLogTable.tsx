import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Button, DateField, Select, Text, TextField, Tooltip } from '@tedi-design-system/react/tedi';
import { useAuth } from '../auth/AuthContext';
import { AppTable } from '../../shared/components/AppTable';
import { formatDateTime, toIsoDate } from '../../hooks/dateUtils';
import { PERMISSIONS } from '../../constants/constants';
import { useOutboundLog } from './useOutboundLog';
import { OutboundReportModal } from './OutboundReportModal';
import { resendNotification } from './api';
import type { OutboundLogEntry } from './types';

const columnHelper = createColumnHelper<OutboundLogEntry>();

const MESSAGE_TYPES = [
  'ncr_violation',
  'ncr_response',
  'driving_ban',
  'weight_violation',
  'carrier_violation',
  'labor_kabotage',
  'labor_foreign_proposal',
] as const;

/**
 * Staatuse-veerg kuvab "Saatmisel" nii `queued` kui `in_progress` väärtuste korral —
 * analüüs 12-2 järgi on kasutajale nähtav ainult 3 staatust (vt filtri kommentaari all).
 */
function statusLabel(t: (key: string) => string, status: OutboundLogEntry['status']): string {
  switch (status) {
    case 'queued':
    case 'in_progress':
      return t('notifications.log.statusSending');
    case 'sent':
      return t('notifications.log.sent');
    case 'error':
    default:
      return t('notifications.log.statusError');
  }
}

export function OutboundLogTable() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canResend = hasPermission(PERMISSIONS.NOTIFICATION_RESEND);
  const {
    data,
    totalRows,
    isLoading,
    pagination,
    setPagination,
    sorting,
    setSorting,
    draftFilters,
    setFilter,
    applyFilters,
    resetFilters,
    resetKey,
  } = useOutboundLog();

  const [reportLogId, setReportLogId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // API toetab filtrina ainult üht status-väärtust korraga, seega jäävad 4 API-väärtust
  // (queued/in_progress/sent/error) filtrisse eraldi valikutena, kuigi tabeli enda
  // staatuse-veerg näitab kasutajale ainult 3 väärtust (vt statusLabel).
  const statusOptions = useMemo(
    () => [
      { value: 'queued', label: t('notifications.log.statusQueued') },
      { value: 'in_progress', label: t('notifications.log.statusInProgress') },
      { value: 'sent', label: t('notifications.log.sent') },
      { value: 'error', label: t('notifications.log.statusError') },
    ],
    [t],
  );

  const typeOptions = useMemo(
    () => MESSAGE_TYPES.map((v) => ({ value: v, label: t(`notifications.types.${v}`) })),
    [t],
  );

  const handleResend = useCallback(
    async (logId: string) => {
      if (!window.confirm(t('notifications.log.resendConfirm'))) return;
      setResendingId(logId);
      try {
        await resendNotification(logId);
        applyFilters();
      } finally {
        setResendingId(null);
      }
    },
    [t, applyFilters],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('sendDate', {
        header: t('notifications.log.sendDate'),
        enableSorting: true,
        cell: (info) => formatDateTime(info.getValue()),
      }),
      columnHelper.accessor('notificationType', {
        header: t('notifications.log.messageType'),
        enableSorting: true,
        cell: (info) =>
          t(`notifications.types.${info.getValue()}`, {
            defaultValue: info.getValue(),
          }),
      }),
      columnHelper.accessor('recipientAddress', {
        header: t('notifications.log.addressee'),
        enableSorting: true,
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('notificationKey', {
        header: t('notifications.log.notificationKey'),
        enableSorting: true,
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('status', {
        header: t('notifications.log.status'),
        enableSorting: true,
        cell: (info) => {
          const label = statusLabel(t, info.getValue());
          const failureReason = info.row.original.failureReason;
          if (info.getValue() === 'error' && failureReason) {
            return (
              <Tooltip>
                <Tooltip.Trigger>
                  <span>{label}</span>
                </Tooltip.Trigger>
                <Tooltip.Content>{failureReason}</Tooltip.Content>
              </Tooltip>
            );
          }
          return label;
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: (info) => (
          <div className="filter-actions">
            <Button
              visualType="secondary"
              size="small"
              onClick={() => setReportLogId(info.row.original.id)}
            >
              {t('notifications.log.report')}
            </Button>
            {info.row.original.status === 'error' && canResend && (
              <Button
                size="small"
                disabled={resendingId === info.row.original.id}
                onClick={() => void handleResend(info.row.original.id)}
              >
                {t('notifications.log.resend')}
              </Button>
            )}
          </div>
        ),
      }),
    ],
    [t, canResend, resendingId, handleResend],
  );

  return (
    <>
      <div className="filter-bar">
        <DateField
          key={`outbound-date-from-${resetKey}`}
          id="outbound-filter-date-from"
          label={t('notifications.log.filterDateFrom')}
          selected={
            draftFilters.dateFrom ? new Date(draftFilters.dateFrom) : undefined
          }
          onSelect={(v) => setFilter('dateFrom', toIsoDate(v))}
          placeholder={t('common.dateFieldPlaceholder')}
          monthYearSelectType="grid"
        />
        <DateField
          key={`outbound-date-to-${resetKey}`}
          id="outbound-filter-date-to"
          label={t('notifications.log.filterDateTo')}
          selected={
            draftFilters.dateTo ? new Date(draftFilters.dateTo) : undefined
          }
          onSelect={(v) => setFilter('dateTo', toIsoDate(v))}
          placeholder={t('common.dateFieldPlaceholder')}
          monthYearSelectType="grid"
        />
        <Select
          id="outbound-filter-type"
          label={t('notifications.log.filterType')}
          options={[{ value: '', label: '\u00a0' }, ...typeOptions]}
          value={
            typeOptions.find(
              (o) => o.value === draftFilters.notificationType,
            ) ?? null
          }
          onChange={(o) =>
            setFilter(
              'notificationType',
              (o as { value?: string } | null)?.value ?? '',
            )
          }
        />
        <TextField
          id="outbound-filter-recipient"
          label={t('notifications.log.filterRecipient')}
          value={draftFilters.recipient ?? ''}
          onChange={(v) => setFilter('recipient', v)}
        />
        <TextField
          id="outbound-filter-notification-key"
          label={t('notifications.log.filterNotificationKey')}
          value={draftFilters.notificationKey ?? ''}
          onChange={(v) => setFilter('notificationKey', v)}
        />
        <Select
          id="outbound-filter-status"
          label={t('notifications.log.filterStatus')}
          options={[{ value: '', label: '\u00a0' }, ...statusOptions]}
          value={
            statusOptions.find((o) => o.value === draftFilters.status) ?? null
          }
          onChange={(o) =>
            setFilter('status', (o as { value?: string } | null)?.value ?? '')
          }
        />
        <div className="filter-actions">
          <Button onClick={applyFilters}>{t('common.search')}</Button>
          <Button visualType="secondary" onClick={resetFilters}>
            {t('common.clear')}
          </Button>
        </div>
      </div>

      {!isLoading && totalRows === 0 ? (
        <Text>{t('notifications.log.emptyResult')}</Text>
      ) : (
        <AppTable
          id="outbound-log-table"
          data={data}
          columns={columns}
          isLoading={isLoading}
          totalRows={totalRows}
          pagination={pagination}
          onPaginationChange={setPagination}
          sorting={sorting}
          onSortingChange={setSorting}
          manualPagination
          manualSorting
        />
      )}

      <OutboundReportModal
        key={reportLogId ?? 'report-closed'}
        logId={reportLogId}
        onClose={() => setReportLogId(null)}
      />
    </>
  );
}
