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
import { useCtudList } from './useCtudList';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../../../constants/constants';

const columnHelper = createColumnHelper<CtudRequestListItem>();

export function CtudListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const { label, options } = useClassifierLabel();

  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
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

  const countryOptions = useMemo(() => options('COUNTRY'), [options]);
  const statusOptions = useMemo(() => options('CTUD_REQUEST_STATUS'), [options]);
  const directionOptions = useMemo(() => options('CTUD_DIRECTION'), [options]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('businessCaseId', {
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
      columnHelper.accessor('sentAt', {
        header: t('erru.ctud.list.sentAt'),
        enableSorting: true,
        cell: (info) => {
          const v = info.getValue();
          return v ? new Date(v).toLocaleDateString('et-EE') : '—';
        },
      }),
      columnHelper.accessor('ctudFrom', {
        header: t('erru.ctud.list.ctudFrom'),
        enableSorting: true,
        cell: (info) => label('COUNTRY', info.getValue()),
      }),
      columnHelper.accessor('ctudTo', {
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
      // Status merges the lifecycle status with the single-country response outcome.
      columnHelper.accessor('status', {
        header: t('erru.ctud.list.status'),
        enableSorting: true,
        cell: (info) => {
          const status = label('CTUD_REQUEST_STATUS', info.getValue());
          const code = info.row.original.responseStatusCode;
          return code
            ? `${status} / ${label('CTUD_RESPONSE_STATUS', code)}`
            : status;
        },
      }),
      columnHelper.accessor('handlerName', {
        header: t('erru.ctud.list.handler'),
        enableSorting: true,
        // Platform-generated requests have no handler — rendered as an en dash.
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('direction', {
        header: t('erru.ctud.list.direction'),
        enableSorting: false,
        cell: (info) => label('CTUD_DIRECTION', info.getValue()),
      }),
    ],
    [t, openRequest, label],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">{t('erru.ctud.list.title')}</Heading>
            {canCreate && (
              <Button onClick={() => navigate('/erru/ctud/new')}>
                {t('erru.ctud.list.newRequest')}
              </Button>
            )}
          </div>

          {/* Filters are applied only on "Otsi" — editing them must not refetch. */}
          <div className="filter-bar" style={isDesktop ? { width: '80%' } : undefined}>
            <TextField
              id="ctud-filter-id"
              label={t('erru.ctud.list.id')}
              value={draftFilters.businessCaseId ?? ''}
              onChange={(v) => setFilter('businessCaseId', v)}
            />
            <DateField
              key={`ctud-sent-from-${resetKey}`}
              id="ctud-filter-sent-from"
              label={t('erru.ctud.filters.sentFrom')}
              selected={draftFilters.sentFrom ? new Date(draftFilters.sentFrom) : undefined}
              onSelect={(v) => setFilter('sentFrom', toIsoDate(v))}
              placeholder={t('common.dateFieldPlaceholder')}
              monthYearSelectType="grid"
            />
            <DateField
              key={`ctud-sent-until-${resetKey}`}
              id="ctud-filter-sent-until"
              label={t('erru.ctud.filters.sentUntil')}
              selected={draftFilters.sentUntil ? new Date(draftFilters.sentUntil) : undefined}
              onSelect={(v) => setFilter('sentUntil', toIsoDate(v))}
              placeholder={t('common.dateFieldPlaceholder')}
              monthYearSelectType="grid"
            />
            <Select
              id="ctud-filter-from"
              label={t('erru.ctud.list.ctudFrom')}
              options={countryOptions}
              value={countryOptions.find((o) => o.value === draftFilters.ctudFrom) ?? null}
              onChange={(o) =>
                setFilter('ctudFrom', (o as { value?: string } | null)?.value ?? '')
              }
            />
            <Select
              id="ctud-filter-to"
              label={t('erru.ctud.list.ctudTo')}
              options={countryOptions}
              value={countryOptions.find((o) => o.value === draftFilters.ctudTo) ?? null}
              onChange={(o) =>
                setFilter('ctudTo', (o as { value?: string } | null)?.value ?? '')
              }
            />
            {/* These three are OR-combined with each other, server-side. */}
            <TextField
              id="ctud-filter-name"
              label={t('erru.ctud.list.undertakingName')}
              value={draftFilters.transportUndertakingName ?? ''}
              onChange={(v) => setFilter('transportUndertakingName', v)}
            />
            <TextField
              id="ctud-filter-licence"
              label={t('erru.ctud.list.licenceNumber')}
              value={draftFilters.communityLicenceNumber ?? ''}
              onChange={(v) => setFilter('communityLicenceNumber', v)}
            />
            <TextField
              id="ctud-filter-vehicle"
              label={t('erru.ctud.list.vehicleNumber')}
              value={draftFilters.vehicleRegistrationNumber ?? ''}
              onChange={(v) => setFilter('vehicleRegistrationNumber', v)}
            />
            <Select
              id="ctud-filter-status"
              label={t('erru.ctud.list.status')}
              options={statusOptions}
              value={statusOptions.find((o) => o.value === draftFilters.status) ?? null}
              onChange={(o) =>
                setFilter('status', (o as { value?: string } | null)?.value ?? '')
              }
            />
            <Select
              id="ctud-filter-direction"
              label={t('erru.ctud.list.direction')}
              options={directionOptions}
              value={directionOptions.find((o) => o.value === draftFilters.direction) ?? null}
              onChange={(o) =>
                setFilter('direction', (o as { value?: string } | null)?.value ?? '')
              }
            />
            <TextField
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
