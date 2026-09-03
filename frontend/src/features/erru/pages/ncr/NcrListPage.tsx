import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { AppTable } from '../../../../shared/components/AppTable';
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
import type { NcrCaseListItem } from '../../types';
import { useNcrList } from './useNcrList';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';

const columnHelper = createColumnHelper<NcrCaseListItem & { rowClassName?: string }>();

/**
 * NCR case list (LJVIS2-65) — both incoming and outgoing, one row per case. Rows with at
 * least one serious infringement (hasInfringement, computed server-side from
 * serious_infringements) are highlighted red (.ncr-row-infringement). All filters are
 * AND-combined and applied only on "Otsi" (LJVIS2-65 §4 "Filtrid").
 */
export function NcrListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const { label, options } = useClassifierLabel();

  const forbidden = !hasAnyPermission(['ncr.list']);
  const canCreate = hasAnyPermission(['ncr.create']);

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
  } = useNcrList();

  const openCase = useCallback(
    (row: NcrCaseListItem) => navigate(`/erru/ncr/${row.businessCaseId}`),
    [navigate],
  );

  const countryOptions = useMemo(() => options('COUNTRY'), [options]);
  const statusOptions = useMemo(() => options('NCR_REQUEST_STATUS'), [options]);
  const directionOptions = [
    { value: 'outgoing', label: t('erru.ncr.list.directionOutgoing') },
    { value: 'incoming', label: t('erru.ncr.list.directionIncoming') },
  ];

  // Rows with a serious infringement get a red background via rowClassName (a data-level
  // field the community Table component reads per row — see LJVIS2-65 §4).
  const rows = useMemo(
    () => data.map((row) => ({ ...row, rowClassName: row.hasInfringement ? 'ncr-row-infringement' : undefined })),
    [data],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('businessCaseId', {
        header: t('erru.ncr.list.id'),
        enableSorting: true,
        cell: (info) => (
          <a
            href={`/erru/ncr/${info.row.original.businessCaseId}`}
            onClick={(e) => {
              e.preventDefault();
              openCase(info.row.original);
            }}
            className="table-link"
          >
            {info.getValue()}
          </a>
        ),
      }),
      columnHelper.accessor('sentAt', {
        header: t('erru.ncr.list.sentAt'),
        enableSorting: true,
        cell: (info) => {
          const v = info.getValue();
          return v ? new Date(v).toLocaleDateString('et-EE') : '—';
        },
      }),
      columnHelper.accessor('ncrFrom', {
        header: t('erru.ncr.list.ncrFrom'),
        enableSorting: true,
        cell: (info) => label('COUNTRY', info.getValue()),
      }),
      columnHelper.accessor('ncrTo', {
        header: t('erru.ncr.list.ncrTo'),
        enableSorting: true,
        cell: (info) => label('COUNTRY', info.getValue()),
      }),
      columnHelper.accessor('transportUndertakingName', {
        header: t('erru.ncr.list.transportUndertakingName'),
        enableSorting: true,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('direction', {
        header: t('erru.ncr.list.direction'),
        enableSorting: false,
        cell: (info) =>
          info.getValue() === 'outgoing'
            ? t('erru.ncr.list.directionOutgoing')
            : t('erru.ncr.list.directionIncoming'),
      }),
      columnHelper.accessor('status', {
        header: t('erru.ncr.list.status'),
        enableSorting: true,
        cell: (info) => label('NCR_REQUEST_STATUS', info.getValue()),
      }),
      columnHelper.accessor('handlerName', {
        header: t('erru.ncr.list.handler'),
        enableSorting: true,
        cell: (info) => info.getValue() || '—',
      }),
    ],
    [t, openCase, label],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">{t('erru.ncr.list.title')}</Heading>
            {canCreate && (
              <Button onClick={() => navigate('/erru/ncr/new')}>{t('erru.ncr.list.newMessage')}</Button>
            )}
          </div>

          {/* Filters refresh only on "Otsi" — editing must not auto-refetch. */}
          <div className="filter-bar">
            <TextField
              id="ncr-filter-id"
              label={t('erru.ncr.list.id')}
              value={draftFilters.businessCaseId ?? ''}
              onChange={(v) => setFilter('businessCaseId', v)}
            />
            <DateField
              key={`ncr-sent-from-${resetKey}`}
              id="ncr-filter-sent-from"
              label={t('erru.ncr.list.sentFrom')}
              selected={draftFilters.sentFrom ? new Date(draftFilters.sentFrom) : undefined}
              onSelect={(v) => setFilter('sentFrom', toIsoDate(v))}
              placeholder={t('common.dateFieldPlaceholder')}
              monthYearSelectType="grid"
            />
            <DateField
              key={`ncr-sent-until-${resetKey}`}
              id="ncr-filter-sent-until"
              label={t('erru.ncr.list.sentUntil')}
              selected={draftFilters.sentUntil ? new Date(draftFilters.sentUntil) : undefined}
              onSelect={(v) => setFilter('sentUntil', toIsoDate(v))}
              placeholder={t('common.dateFieldPlaceholder')}
              monthYearSelectType="grid"
            />
            <Select
              id="ncr-filter-from"
              label={t('erru.ncr.list.ncrFrom')}
              options={countryOptions}
              value={countryOptions.find((o) => o.value === draftFilters.ncrFrom) ?? null}
              onChange={(o) => setFilter('ncrFrom', (o as { value?: string } | null)?.value ?? '')}
            />
            <Select
              id="ncr-filter-to"
              label={t('erru.ncr.list.ncrTo')}
              options={countryOptions}
              value={countryOptions.find((o) => o.value === draftFilters.ncrTo) ?? null}
              onChange={(o) => setFilter('ncrTo', (o as { value?: string } | null)?.value ?? '')}
            />
            <Select
              id="ncr-filter-status"
              label={t('erru.ncr.list.status')}
              options={statusOptions}
              value={statusOptions.find((o) => o.value === draftFilters.status) ?? null}
              onChange={(o) => setFilter('status', (o as { value?: string } | null)?.value ?? '')}
            />
            <Select
              id="ncr-filter-direction"
              label={t('erru.ncr.list.direction')}
              options={directionOptions}
              value={directionOptions.find((o) => o.value === draftFilters.direction) ?? null}
              onChange={(o) => setFilter('direction', (o as { value?: string } | null)?.value ?? '')}
            />
            <TextField
              id="ncr-filter-handler"
              label={t('erru.ncr.list.handlerFilter')}
              value={draftFilters.handlerPersonalCode ?? ''}
              onChange={(v) => setFilter('handlerPersonalCode', v)}
            />
            <div className="filter-actions">
              <Button onClick={applyFilters}>{t('common.search')}</Button>
              <Button visualType="secondary" onClick={resetFilters}>
                {t('common.clear')}
              </Button>
            </div>
          </div>

          <AppTable
            id="ncr-table"
            data={rows}
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
        </Card.Content>
      </Card>
    </div>
  );
}
