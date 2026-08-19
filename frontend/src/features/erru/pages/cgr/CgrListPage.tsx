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
import type { CgrRequestListItem } from '../../types';
import { useCgrList } from './useCgrList';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';

const columnHelper = createColumnHelper<CgrRequestListItem>();

/**
 * CGR request list (LJVIS2-140) — OUTGOING requests only ("Eesti saadetud... väljaminevad
 * päringud"), unlike the CTUD list which shows both directions. No direction
 * column/filter here.
 */
export function CgrListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const { label, options } = useClassifierLabel();

  const forbidden = !hasAnyPermission(['cgr.read']);
  const canCreate = hasAnyPermission(['cgr.create']);

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
  } = useCgrList();

  const openRequest = useCallback(
    (row: CgrRequestListItem) => navigate(`/erru/cgr/${row.id}`),
    [navigate],
  );

  /** ZZ is the broadcast marker ("Kõik riigid") — not part of the COUNTRY classifier. */
  const cgrToLabel = useCallback(
    (code: string | null | undefined) =>
      code === 'ZZ' ? t('erru.cgr.form.cgrToAll') : label('COUNTRY', code),
    [label, t],
  );

  const countryOptions = useMemo(() => options('COUNTRY'), [options]);
  const statusOptions = useMemo(() => options('CGR_REQUEST_STATUS'), [options]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('businessCaseId', {
        header: t('erru.cgr.list.id'),
        enableSorting: true,
        cell: (info) => (
          <a
            href={`/erru/cgr/${info.row.original.id}`}
            onClick={(e) => {
              e.preventDefault();
              openRequest(info.row.original);
            }}
            className="table-link"
          >
            {info.getValue()}
          </a>
        ),
      }),
      columnHelper.accessor('sentAt', {
        header: t('erru.cgr.list.sentAt'),
        enableSorting: true,
        cell: (info) => {
          const v = info.getValue();
          return v ? new Date(v).toLocaleDateString('et-EE') : '—';
        },
      }),
      columnHelper.accessor('tmFirstName', {
        header: t('erru.cgr.list.tmFirstName'),
        enableSorting: true,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('tmFamilyName', {
        header: t('erru.cgr.list.tmFamilyName'),
        enableSorting: true,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('cgrTo', {
        header: t('erru.cgr.list.cgrTo'),
        enableSorting: true,
        cell: (info) => cgrToLabel(info.getValue()),
      }),
      // Status merges the lifecycle status with the single-country response outcome.
      // Broadcast requests (cgrTo = ZZ) never carry responseStatusCode here — the
      // per-country breakdown is shown only in the request detail view.
      columnHelper.accessor('status', {
        header: t('erru.cgr.list.status'),
        enableSorting: true,
        cell: (info) => {
          const status = label('CGR_REQUEST_STATUS', info.getValue());
          const code = info.row.original.responseStatusCode;
          return code
            ? `${status} / ${label('CGR_MEMBER_STATE_STATUS', code)}`
            : status;
        },
      }),
      columnHelper.accessor('handlerName', {
        header: t('erru.cgr.list.handler'),
        enableSorting: true,
        cell: (info) => info.getValue() || '—',
      }),
    ],
    [t, openRequest, label, cgrToLabel],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">{t('erru.cgr.list.title')}</Heading>
            {canCreate && (
              <Button onClick={() => navigate('/erru/cgr/new')}>
                {t('erru.cgr.list.newRequest')}
              </Button>
            )}
          </div>

          {/* Filters are applied only on "Otsi" — editing them must not refetch. */}
          <div className="filter-bar">
            <TextField
              id="cgr-filter-id"
              label={t('erru.cgr.list.id')}
              value={draftFilters.businessCaseId ?? ''}
              onChange={(v) => setFilter('businessCaseId', v)}
            />
            <TextField
              id="cgr-filter-first-name"
              label={t('erru.cgr.list.tmFirstName')}
              value={draftFilters.tmFirstName ?? ''}
              onChange={(v) => setFilter('tmFirstName', v)}
            />
            <TextField
              id="cgr-filter-family-name"
              label={t('erru.cgr.list.tmFamilyName')}
              value={draftFilters.tmFamilyName ?? ''}
              onChange={(v) => setFilter('tmFamilyName', v)}
            />
            <DateField
              id="cgr-filter-sent-from"
              label={t('erru.cgr.filters.sentFrom')}
              selected={draftFilters.sentFrom ? new Date(draftFilters.sentFrom) : undefined}
              onSelect={(v) => setFilter('sentFrom', toIsoDate(v))}
              placeholder={t('common.dateFieldPlaceholder')}
              monthYearSelectType="grid"
            />
            <DateField
              id="cgr-filter-sent-until"
              label={t('erru.cgr.filters.sentUntil')}
              selected={draftFilters.sentUntil ? new Date(draftFilters.sentUntil) : undefined}
              onSelect={(v) => setFilter('sentUntil', toIsoDate(v))}
              placeholder={t('common.dateFieldPlaceholder')}
              monthYearSelectType="grid"
            />
            <Select
              id="cgr-filter-to"
              label={t('erru.cgr.list.cgrTo')}
              options={countryOptions}
              value={countryOptions.find((o) => o.value === draftFilters.cgrTo) ?? null}
              onChange={(o) =>
                setFilter('cgrTo', (o as { value?: string } | null)?.value ?? '')
              }
            />
            <Select
              id="cgr-filter-status"
              label={t('erru.cgr.list.status')}
              options={statusOptions}
              value={statusOptions.find((o) => o.value === draftFilters.status) ?? null}
              onChange={(o) =>
                setFilter('status', (o as { value?: string } | null)?.value ?? '')
              }
            />
            <TextField
              id="cgr-filter-handler"
              label={t('erru.cgr.list.handlerFilter')}
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
            id="cgr-table"
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
        </Card.Content>
      </Card>
    </div>
  );
}
