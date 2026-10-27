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
import type { CtudRequestListItem } from '../../types';
import { ErruResultBadge, ErruStatusBadge } from '../../components/shared/ErruStatusBadge';
import { ErruDirection } from '../../components/shared/ErruDirection';
import { useCtudList } from './useCtudList';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import styles from './CtudListPage.module.css';

const columnHelper = createColumnHelper<CtudRequestListItem>();

export function CtudListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const { label, options } = useClassifierLabel();
  const { getErruMemberCountries } = useClassifiers();
  const forbidden = !hasAnyPermission(['ctud.read']);
  const canCreate = hasAnyPermission(['ctud.create']);

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
  } = useCtudList();

  const openRequest = useCallback(
    (row: CtudRequestListItem) => navigate(`/erru/ctud/${row.id}`),
    [navigate],
  );

  const countryOptions = useMemo(
    () => getErruMemberCountries().map((c) => ({ value: c.code, label: c.name })),
    [getErruMemberCountries],
  );
  const statusOptions = useMemo(() => options('CTUD_REQUEST_STATUS'), [options]);
  const directionOptions = useMemo(() => options('CTUD_DIRECTION'), [options]);

  const columns = useMemo(
    () => [
      // Lifecycle status and the single-country response outcome ("Tulemus") are separate columns.
      // Broadcast requests (cgrTo/ctudTo = ZZ) carry no outcome here — the per-country breakdown
      // is shown only in the request detail view.
      columnHelper.accessor('status', {
        enableHiding: false,
        header: t('erru.ctud.list.status'),
        enableSorting: true,
        cell: (info) => (
          <ErruStatusBadge status={info.getValue()}>
            {label('CTUD_REQUEST_STATUS', info.getValue())}
          </ErruStatusBadge>
        ),
      }),
      columnHelper.accessor('responseStatusCode', {
        header: t('erru.ctud.list.result'),
        enableSorting: false,
        cell: (info) => (
          <ErruResultBadge code={info.getValue()}>
            {label('CTUD_RESPONSE_STATUS', info.getValue())}
          </ErruResultBadge>
        ),
      }),
      columnHelper.accessor('direction', {
        header: t('erru.ctud.list.direction'),
        enableSorting: false,
        cell: (info) => (
          <ErruDirection direction={info.getValue()}>
            {label('CTUD_DIRECTION', info.getValue())}
          </ErruDirection>
        ),
      }),
      columnHelper.accessor('sentAt', {
        enableHiding: false,
        header: t('erru.ctud.list.sentAt'),
        enableSorting: true,
        cell: (info) => {
          const v = info.getValue();
          return v ? new Date(v).toLocaleDateString('et-EE') : '—';
        },
      }),
      columnHelper.accessor('businessCaseId', {
        enableHiding: false,
        header: t('erru.ctud.list.id'),
        enableSorting: true,
        cell: (info) => (
          <a
            href={`/erru/ctud/${info.row.original.id}`}
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
      columnHelper.accessor('ctudFrom', {
        enableHiding: false,
        header: t('erru.ctud.list.ctudFrom'),
        enableSorting: true,
        cell: (info) => label('COUNTRY', info.getValue()),
      }),
      columnHelper.accessor('ctudTo', {
        enableHiding: false,
        header: t('erru.ctud.list.ctudTo'),
        enableSorting: true,
        cell: (info) => label('COUNTRY', info.getValue()),
      }),
      columnHelper.accessor('transportUndertakingName', {
        header: t('erru.ctud.list.undertakingName'),
        enableSorting: true,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('communityLicenceNumber', {
        header: t('erru.ctud.list.licenceNumber'),
        enableSorting: false,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('vehicleRegistrationNumber', {
        header: t('erru.ctud.list.vehicleNumber'),
        enableSorting: false,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('handlerName', {
        header: t('erru.ctud.list.handler'),
        enableSorting: true,
        // Platform-generated requests have no handler — rendered as an en dash.
        cell: (info) => (
          <span className="nowrap-cell">{info.getValue() || '—'}</span>
        ),
      }),
    ],
    [t, openRequest, label],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div className={styles.page}>
      <Card className="mt-05">
        <Card.Content>
          <div className={`card-main ${styles.header}`}>
            <Heading element="h1">{t('erru.ctud.list.title')}</Heading>
            {canCreate && (
              <Button onClick={() => navigate('/erru/ctud/new')}>
                {t('erru.ctud.list.newRequest')}
              </Button>
            )}
          </div>

          {/* Filters are applied only on "Otsi" — editing them must not refetch. */}
          <div
            className="filter-bar filter-bar--compact"
          >
            <TextField
              size="small"
              id="ctud-filter-id"
              label={t('erru.ctud.list.id')}
              value={draftFilters.businessCaseId ?? ''}
              onChange={(v) => setFilter('businessCaseId', v)}
            />
            <DateField
              inputProps={{ size: 'small' }}
              key={`ctud-sent-from-${resetKey}`}
              id="ctud-filter-sent-from"
              label={t('erru.ctud.filters.sentFrom')}
              selected={
                draftFilters.sentFrom
                  ? new Date(draftFilters.sentFrom)
                  : undefined
              }
              onSelect={(v) => setFilter('sentFrom', toIsoDate(v))}
              placeholder={t('common.dateFieldPlaceholder')}
              monthYearSelectType="grid"
            />
            <DateField
              inputProps={{ size: 'small' }}
              key={`ctud-sent-until-${resetKey}`}
              id="ctud-filter-sent-until"
              label={t('erru.ctud.filters.sentUntil')}
              selected={
                draftFilters.sentUntil
                  ? new Date(draftFilters.sentUntil)
                  : undefined
              }
              onSelect={(v) => setFilter('sentUntil', toIsoDate(v))}
              placeholder={t('common.dateFieldPlaceholder')}
              monthYearSelectType="grid"
            />
            <Select
              size="small"
              id="ctud-filter-from"
              label={t('erru.ctud.list.ctudFrom')}
              options={[{ value: '', label: '\u00a0' }, ...countryOptions]}
              value={
                countryOptions.find((o) => o.value === draftFilters.ctudFrom) ??
                null
              }
              onChange={(o) =>
                setFilter(
                  'ctudFrom',
                  (o as { value?: string } | null)?.value ?? '',
                )
              }
            />
            <Select
              size="small"
              id="ctud-filter-to"
              label={t('erru.ctud.list.ctudTo')}
              options={[{ value: '', label: '\u00a0' }, ...countryOptions]}
              value={
                countryOptions.find((o) => o.value === draftFilters.ctudTo) ??
                null
              }
              onChange={(o) =>
                setFilter(
                  'ctudTo',
                  (o as { value?: string } | null)?.value ?? '',
                )
              }
            />
            {/* These three are OR-combined with each other, server-side. */}
            <TextField
              size="small"
              id="ctud-filter-name"
              label={t('erru.ctud.list.undertakingName')}
              value={draftFilters.transportUndertakingName ?? ''}
              onChange={(v) => setFilter('transportUndertakingName', v)}
            />
            <TextField
              size="small"
              id="ctud-filter-licence"
              label={t('erru.ctud.list.licenceNumber')}
              value={draftFilters.communityLicenceNumber ?? ''}
              onChange={(v) => setFilter('communityLicenceNumber', v)}
            />
            <TextField
              size="small"
              id="ctud-filter-vehicle"
              label={t('erru.ctud.list.vehicleNumber')}
              value={draftFilters.vehicleRegistrationNumber ?? ''}
              onChange={(v) => setFilter('vehicleRegistrationNumber', v)}
            />
            <Select
              size="small"
              id="ctud-filter-status"
              label={t('erru.ctud.list.status')}
              options={[{ value: '', label: '\u00a0' }, ...statusOptions]}
              value={
                statusOptions.find((o) => o.value === draftFilters.status) ??
                null
              }
              onChange={(o) =>
                setFilter(
                  'status',
                  (o as { value?: string } | null)?.value ?? '',
                )
              }
            />
            <Select
              size="small"
              id="ctud-filter-direction"
              label={t('erru.ctud.list.direction')}
              options={[{ value: '', label: '\u00a0' }, ...directionOptions]}
              value={
                directionOptions.find(
                  (o) => o.value === draftFilters.direction,
                ) ?? null
              }
              onChange={(o) =>
                setFilter(
                  'direction',
                  (o as { value?: string } | null)?.value ?? '',
                )
              }
            />
            <TextField
              size="small"
              id="ctud-filter-handler"
              label={t('erru.ctud.list.handlerFilter')}
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
            className={styles.table}
            customizable
            persistKey="erru-ctud-list"
            size="small"
            id="ctud-table"
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
