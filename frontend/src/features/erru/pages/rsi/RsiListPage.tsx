import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import {
  Button,
  Card,
  DateField,
  Heading,
  Select,
  Text,
  TextField,
} from '@tedi-design-system/react/tedi';
import { toIsoDate } from '../../../../hooks/dateUtils';
import type { RsiMessageListItem } from '../../types';
import { useRsiList } from './useRsiList';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';

const columnHelper = createColumnHelper<RsiMessageListItem>();

/**
 * RSI message list (LJVIS2-149) — BOTH incoming and outgoing, unlike the CGR list which
 * shows only outgoing. The status column merges the lifecycle status with the response
 * status code where present. Text filters ID and vehicleRegistrationNumber are OR-combined.
 */
export function RsiListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const { getByCode, getValue } = useClassifiers();

  const forbidden = !hasAnyPermission(['rsi.read']);
  const canCreate = hasAnyPermission(['rsi.create']);

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
  } = useRsiList();

  const openMessage = useCallback(
    (row: RsiMessageListItem) => navigate(`/erru/rsi/${row.id}`),
    [navigate],
  );

  const label = useCallback(
    (classifier: string, code: string | null | undefined) =>
      code ? (getValue(classifier, code)?.name ?? code) : '—',
    [getValue],
  );

  const countryOptions = useMemo(
    () => getByCode('COUNTRY').map((c) => ({ value: c.code, label: c.name })),
    [getByCode],
  );
  const statusOptions = useMemo(
    () =>
      getByCode('RSI_REQUEST_STATUS').map((c) => ({
        value: c.code,
        label: c.name,
      })),
    [getByCode],
  );
  const directionOptions = [
    { value: 'outgoing', label: t('erru.rsi.list.directionOutgoing') },
    { value: 'incoming', label: t('erru.rsi.list.directionIncoming') },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor('businessCaseId', {
        header: t('erru.rsi.list.id'),
        enableSorting: true,
        cell: (info) => (
          <a
            href={`/erru/rsi/${info.row.original.id}`}
            onClick={(e) => {
              e.preventDefault();
              openMessage(info.row.original);
            }}
            className="table-link"
          >
            {info.getValue()}
          </a>
        ),
      }),
      columnHelper.accessor('sentAt', {
        header: t('erru.rsi.list.sentAt'),
        enableSorting: true,
        cell: (info) => {
          const v = info.getValue();
          return v ? new Date(v).toLocaleDateString('et-EE') : '—';
        },
      }),
      columnHelper.accessor('rsiFrom', {
        header: t('erru.rsi.list.rsiFrom'),
        enableSorting: true,
        cell: (info) => label('COUNTRY', info.getValue()),
      }),
      columnHelper.accessor('rsiTo', {
        header: t('erru.rsi.list.rsiTo'),
        enableSorting: true,
        cell: (info) => label('COUNTRY', info.getValue()),
      }),
      columnHelper.accessor('vehicleRegistrationNumber', {
        header: t('erru.rsi.list.vehicleRegistrationNumber'),
        enableSorting: false,
        cell: (info) => info.getValue() || '—',
      }),
      // Status merges lifecycle status with response outcome where present.
      columnHelper.accessor('status', {
        header: t('erru.rsi.list.status'),
        enableSorting: true,
        cell: (info) => {
          const status = label('RSI_REQUEST_STATUS', info.getValue());
          const code = info.row.original.responseStatusCode;
          return code
            ? `${status} / ${label('RSI_RESPONSE_STATUS', code)}`
            : status;
        },
      }),
      columnHelper.accessor('handlerName', {
        header: t('erru.rsi.list.handler'),
        enableSorting: true,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('direction', {
        header: t('erru.rsi.list.direction'),
        enableSorting: false,
        cell: (info) =>
          info.getValue() === 'outgoing'
            ? t('erru.rsi.list.directionOutgoing')
            : t('erru.rsi.list.directionIncoming'),
      }),
    ],
    [t, openMessage, label],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">{t('erru.rsi.list.title')}</Heading>
            {canCreate && (
              <Button onClick={() => navigate('/erru/rsi/new')}>
                {t('erru.rsi.list.newMessage')}
              </Button>
            )}
          </div>

          {/* Filters refresh only on "Otsi" — editing must not auto-refetch. */}
          <div className="filter-bar">
            <TextField
              id="rsi-filter-id"
              label={t('erru.rsi.list.id')}
              value={draftFilters.businessCaseId ?? ''}
              onChange={(v) => setFilter('businessCaseId', v)}
            />
            <TextField
              id="rsi-filter-reg-nr"
              label={t('erru.rsi.list.vehicleRegistrationNumber')}
              value={draftFilters.vehicleRegistrationNumber ?? ''}
              onChange={(v) => setFilter('vehicleRegistrationNumber', v)}
            />
            <DateField
              id="rsi-filter-sent-from"
              label={t('erru.cgr.filters.sentFrom')}
              selected={draftFilters.sentFrom ? new Date(draftFilters.sentFrom) : undefined}
              onSelect={(v) => setFilter('sentFrom', toIsoDate(v))}
              placeholder={t('common.dateFieldPlaceholder')}
            />
            <DateField
              id="rsi-filter-sent-until"
              label={t('erru.cgr.filters.sentUntil')}
              selected={draftFilters.sentUntil ? new Date(draftFilters.sentUntil) : undefined}
              onSelect={(v) => setFilter('sentUntil', toIsoDate(v))}
              placeholder={t('common.dateFieldPlaceholder')}
            />
            <Select
              id="rsi-filter-from"
              label={t('erru.rsi.list.rsiFrom')}
              options={countryOptions}
              value={countryOptions.find((o) => o.value === draftFilters.rsiFrom) ?? null}
              onChange={(o) =>
                setFilter('rsiFrom', (o as { value?: string } | null)?.value ?? '')
              }
            />
            <Select
              id="rsi-filter-to"
              label={t('erru.rsi.list.rsiTo')}
              options={countryOptions}
              value={countryOptions.find((o) => o.value === draftFilters.rsiTo) ?? null}
              onChange={(o) =>
                setFilter('rsiTo', (o as { value?: string } | null)?.value ?? '')
              }
            />
            <Select
              id="rsi-filter-status"
              label={t('erru.rsi.list.status')}
              options={statusOptions}
              value={statusOptions.find((o) => o.value === draftFilters.status) ?? null}
              onChange={(o) =>
                setFilter('status', (o as { value?: string } | null)?.value ?? '')
              }
            />
            <Select
              id="rsi-filter-direction"
              label={t('erru.rsi.list.direction')}
              options={directionOptions}
              value={directionOptions.find((o) => o.value === draftFilters.direction) ?? null}
              onChange={(o) =>
                setFilter('direction', (o as { value?: string } | null)?.value ?? '')
              }
            />
            <div className="filter-actions">
              <Button onClick={applyFilters}>{t('common.search')}</Button>
              <Button visualType="secondary" onClick={resetFilters}>
                {t('common.clear')}
              </Button>
            </div>
          </div>

          <Table
            id="rsi-table"
            className="ljvis-table"
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
            placeholder={{ children: t('common.tableIsEmpty') }}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
