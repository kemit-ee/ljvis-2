import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Button, DateField, StatusBadge, Text } from '@tedi-design-system/react/tedi';
import { AppTable } from '../../shared/components/AppTable';
import { formatDateTime, toIsoDate } from '../../hooks/dateUtils';
import { useXroadLogList } from './useXroadLogList';
import { XroadLogContentModal } from './XroadLogContentModal';
import { XroadLogStatusFilter } from './XroadLogStatusFilter';
import { buildFormLink } from './formLink';
import type { XroadLogEntry } from './types';

const columnHelper = createColumnHelper<XroadLogEntry>();

// resultStatus only carries found/not_found/error semantics for eToimik rows (see
// list_integration_log.sql). Other sources (e.g. erru_cgr) never set it, so those
// rows fall back to the generic success flag instead of being mislabelled "error".
function statusBadgeColor(entry: Pick<XroadLogEntry, 'resultStatus' | 'success'>): 'success' | 'warning' | 'danger' {
  switch (entry.resultStatus) {
    case 'found':
      return 'success';
    case 'error':
      return 'danger';
    case 'not_found':
      return 'warning';
    default:
      return entry.success ? 'success' : 'danger';
  }
}

export function XroadLogTable() {
  const { t } = useTranslation();
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
    resetKey,
  } = useXroadLogList();

  const [requestModalContent, setRequestModalContent] = useState<string | null>(null);
  const [responseModalContent, setResponseModalContent] = useState<string | null>(null);

  const includeFound = draftFilters.includeFound !== 'false';
  const includeNotFound = draftFilters.includeNotFound !== 'false';
  const includeError = draftFilters.includeError !== 'false';
  const allServices = draftFilters.allServices === 'true';

  const toggleScope = () => {
    setFilter('allServices', String(!allServices));
    applyFilters();
  };

  const handleStatusChange = (next: {
    includeFound: boolean;
    includeNotFound: boolean;
    includeError: boolean;
  }) => {
    setFilter('includeFound', String(next.includeFound));
    setFilter('includeNotFound', String(next.includeNotFound));
    setFilter('includeError', String(next.includeError));
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('createdAt', {
        header: t('xroadLogs.column.createdAt'),
        enableSorting: false,
        cell: (info) => formatDateTime(info.getValue()),
      }),
      columnHelper.display({
        id: 'form',
        header: t('xroadLogs.column.form'),
        cell: (info) => {
          const { sourceType, sourceRecordId } = info.row.original;
          const href = buildFormLink(sourceType, sourceRecordId);
          const label = sourceType
            ? t(`xroadLogs.sourceType.${sourceType}`, { defaultValue: sourceType })
            : '—';
          return href ? <Link to={href}>{label}</Link> : label;
        },
      }),
      ...(allServices
        ? [
            columnHelper.accessor('serviceCode', {
              header: t('xroadLogs.column.serviceCode'),
              enableSorting: false,
              cell: (info) => info.getValue() ?? '—',
            }),
          ]
        : []),
      columnHelper.accessor('resultStatus', {
        header: t('xroadLogs.column.status'),
        enableSorting: false,
        cell: (info) => {
          const entry = info.row.original;
          const status = entry.resultStatus;
          const labelKey = status
            ? `xroadLogs.status.${status === 'not_found' ? 'notFound' : status}`
            : `xroadLogs.status.${entry.success ? 'success' : 'error'}`;
          return (
            <StatusBadge color={statusBadgeColor(entry)}>{t(labelKey)}</StatusBadge>
          );
        },
      }),
      columnHelper.display({
        id: 'request',
        header: t('xroadLogs.column.request'),
        cell: (info) => (
          <Button
            visualType="secondary"
            size="small"
            onClick={() => setRequestModalContent(info.row.original.requestXml ?? '')}
          >
            {t('xroadLogs.viewRequest')}
          </Button>
        ),
      }),
      columnHelper.display({
        id: 'response',
        header: t('xroadLogs.column.response'),
        cell: (info) => (
          <Button
            visualType="secondary"
            size="small"
            onClick={() => setResponseModalContent(info.row.original.responseXml ?? '')}
          >
            {t('xroadLogs.viewResponse')}
          </Button>
        ),
      }),
    ],
    [t, allServices],
  );

  return (
    <>
      <Text>
        {t('xroadLogs.scope.prefix')}{' '}
        <Button visualType="link" size="small" onClick={toggleScope}>
          {t(allServices ? 'xroadLogs.scope.all' : 'xroadLogs.scope.etoimik')}
        </Button>{' '}
        {t('xroadLogs.scope.suffix')}
      </Text>
      <div className="filter-bar">
        <DateField
          key={`xroad-log-date-from-${resetKey}`}
          id="xroad-log-filter-date-from"
          label={t('xroadLogs.filter.dateFrom')}
          selected={draftFilters.dateFrom ? new Date(draftFilters.dateFrom) : undefined}
          onSelect={(v) => setFilter('dateFrom', toIsoDate(v))}
          placeholder={t('common.dateFieldPlaceholder')}
          monthYearSelectType="grid"
        />
        <DateField
          key={`xroad-log-date-to-${resetKey}`}
          id="xroad-log-filter-date-to"
          label={t('xroadLogs.filter.dateTo')}
          selected={draftFilters.dateTo ? new Date(draftFilters.dateTo) : undefined}
          onSelect={(v) => setFilter('dateTo', toIsoDate(v))}
          placeholder={t('common.dateFieldPlaceholder')}
          monthYearSelectType="grid"
        />
        <XroadLogStatusFilter
          includeFound={includeFound}
          includeNotFound={includeNotFound}
          includeError={includeError}
          onChange={handleStatusChange}
        />
        <div className="filter-actions">
          <Button onClick={applyFilters}>{t('common.search')}</Button>
        </div>
      </div>

      {!isLoading && totalRows === 0 ? (
        <Text>{t('xroadLogs.emptyResult')}</Text>
      ) : (
        <AppTable
          id="xroad-log-table"
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

      <XroadLogContentModal
        title={t('xroadLogs.viewRequest')}
        content={requestModalContent}
        onClose={() => setRequestModalContent(null)}
      />
      <XroadLogContentModal
        title={t('xroadLogs.viewResponse')}
        content={responseModalContent}
        onClose={() => setResponseModalContent(null)}
      />
    </>
  );
}
