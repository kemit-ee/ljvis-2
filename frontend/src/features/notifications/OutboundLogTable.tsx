import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Button, DateField, Select } from '@tedi-design-system/react/tedi';
import { AppTable } from '../../shared/components/AppTable';
import { formatDate, toIsoDate } from '../../hooks/dateUtils';
import { useOutboundLog } from './useOutboundLog';
import { OutboundReportModal } from './OutboundReportModal';
import { ResendModal } from './ResendModal';
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

function addressee(entry: OutboundLogEntry): string {
  if (entry.firstRecipientName) {
    return entry.firstRecipientCode
      ? `${entry.firstRecipientName} (${entry.firstRecipientCode})`
      : entry.firstRecipientName;
  }
  return entry.firstRecipientEmail ?? '—';
}

export function OutboundLogTable() {
  const { t } = useTranslation();
  const {
    data,
    totalRows,
    isLoading,
    pagination,
    setPagination,
    draftFilters,
    setFilter,
    applyFilters,
    resetFilters,
  } = useOutboundLog();

  const [reportLogId, setReportLogId] = useState<string | null>(null);
  const [resendLogId, setResendLogId] = useState<string | null>(null);

  const statusOptions = useMemo(
    () => [
      { value: 'sent', label: t('notifications.log.sent') },
      { value: 'sent_error', label: t('notifications.log.sent_error') },
    ],
    [t],
  );

  const typeOptions = useMemo(
    () => MESSAGE_TYPES.map((v) => ({ value: v, label: t(`notifications.types.${v}`) })),
    [t],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('sendDate', {
        header: t('notifications.log.sendDate'),
        enableSorting: false,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('messageType', {
        header: t('notifications.log.messageType'),
        enableSorting: false,
        cell: (info) =>
          t(`notifications.types.${info.getValue()}`, {
            defaultValue: info.getValue(),
          }),
      }),
      columnHelper.display({
        id: 'addressee',
        header: t('notifications.log.addressee'),
        cell: (info) => addressee(info.row.original),
      }),
      columnHelper.accessor('status', {
        header: t('notifications.log.status'),
        enableSorting: false,
        cell: (info) =>
          info.getValue() === 'sent'
            ? t('notifications.log.sent')
            : t('notifications.log.sent_error'),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="filter-actions">
            <Button
              visualType="secondary"
              size="small"
              onClick={() => setReportLogId(info.row.original.id)}
            >
              {t('notifications.log.report')}
            </Button>
            {info.row.original.status === 'sent_error' && (
              <Button size="small" onClick={() => setResendLogId(info.row.original.id)}>
                {t('notifications.log.resend')}
              </Button>
            )}
          </div>
        ),
      }),
    ],
    [t],
  );

  return (
    <>
      <div className="filter-bar">
        <Select
          id="outbound-filter-status"
          label={t('notifications.log.filterStatus')}
          options={statusOptions}
          value={statusOptions.find((o) => o.value === draftFilters.status) ?? null}
          onChange={(o) =>
            setFilter('status', (o as { value?: string } | null)?.value ?? '')
          }
        />
        <Select
          id="outbound-filter-type"
          label={t('notifications.log.filterType')}
          options={typeOptions}
          value={typeOptions.find((o) => o.value === draftFilters.messageType) ?? null}
          onChange={(o) =>
            setFilter('messageType', (o as { value?: string } | null)?.value ?? '')
          }
        />
        <DateField
          id="outbound-filter-date-from"
          label={t('notifications.log.filterDateFrom')}
          selected={draftFilters.dateFrom ? new Date(draftFilters.dateFrom) : undefined}
          onSelect={(v) => setFilter('dateFrom', toIsoDate(v))}
          placeholder={t('common.dateFieldPlaceholder')}
          monthYearSelectType="grid"
        />
        <div className="filter-actions">
          <Button onClick={applyFilters}>{t('common.search')}</Button>
          <Button visualType="secondary" onClick={resetFilters}>
            {t('common.clear')}
          </Button>
        </div>
      </div>

      <AppTable
        id="outbound-log-table"
        data={data}
        columns={columns}
        isLoading={isLoading}
        totalRows={totalRows}
        pagination={pagination}
        onPaginationChange={setPagination}
        manualPagination
      />

      <OutboundReportModal
        key={reportLogId ?? 'report-closed'}
        logId={reportLogId}
        onClose={() => setReportLogId(null)}
      />
      <ResendModal
        key={resendLogId ?? 'resend-closed'}
        logId={resendLogId}
        onClose={() => setResendLogId(null)}
        onSuccess={applyFilters}
      />
    </>
  );
}
