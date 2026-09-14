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
import type { NuMessageListItem } from '../../types';
import { useNuList } from './useNuList';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifierLabel } from '../../../classifiers/useClassifierLabel';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { BREAKPOINTS } from '../../../../constants/constants.ts';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';

const columnHelper = createColumnHelper<NuMessageListItem>();

export function NuListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const { label, options } = useClassifierLabel();
  const { getErruMemberCountries } = useClassifiers();

  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const forbidden = !hasAnyPermission(['nu.list']);
  const canCreate = hasAnyPermission(['nu.create']);

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
  } = useNuList();

  const openMessage = useCallback(
    (row: NuMessageListItem) => navigate(`/erru/nu/${row.id}`),
    [navigate],
  );

  const countryOptions = useMemo(
    () =>
      getErruMemberCountries().map((c) => ({ value: c.code, label: c.name })),
    [getErruMemberCountries],
  );
  const statusOptions = useMemo(() => options('NU_MESSAGE_STATUS'), [options]);
  const directionOptions = useMemo(
    () => [
      { value: 'outgoing', label: t('erru.nu.list.directionOutgoing') },
      { value: 'incoming', label: t('erru.nu.list.directionIncoming') },
    ],
    [t],
  );

  const countryLabel = (code: string | null) =>
    !code
      ? '—'
      : code === 'ZZ'
        ? t('erru.nu.form.nuToAll')
        : label('COUNTRY', code);

  const columns = useMemo(
    () => [
      columnHelper.accessor('businessCaseId', {
        header: t('erru.nu.list.id'),
        enableSorting: true,
        cell: (info) => (
          <a
            href={`/erru/nu/${info.row.original.id}`}
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
      columnHelper.accessor('direction', {
        header: t('erru.nu.list.direction'),
        enableSorting: true,
        cell: (info) =>
          info.getValue() === 'outgoing'
            ? t('erru.nu.list.directionOutgoing')
            : t('erru.nu.list.directionIncoming'),
      }),
      columnHelper.accessor('messageDate', {
        header: t('erru.nu.list.date'),
        enableSorting: true,
        cell: (info) => {
          const v = info.getValue();
          return v ? new Date(v).toLocaleDateString('et-EE') : '—';
        },
      }),
      columnHelper.accessor('countryCode', {
        header: t('erru.nu.list.country'),
        enableSorting: true,
        cell: (info) => countryLabel(info.getValue()),
      }),
      columnHelper.accessor('tmFirstName', {
        header: t('erru.nu.list.tmFirstName'),
        enableSorting: true,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('tmFamilyName', {
        header: t('erru.nu.list.tmFamilyName'),
        enableSorting: true,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('handlerName', {
        header: t('erru.nu.list.handler'),
        enableSorting: true,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('status', {
        header: t('erru.nu.list.status'),
        enableSorting: true,
        cell: (info) => label('NU_MESSAGE_STATUS', info.getValue()),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, openMessage, label],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">{t('erru.nu.list.title')}</Heading>
            {canCreate && (
              <Button onClick={() => navigate('/erru/nu/new')}>
                {t('erru.nu.list.newMessage')}
              </Button>
            )}
          </div>

          {/* Filters are applied only on "Otsi" — editing them must not refetch. */}
          <div
            className="filter-bar"
            style={isDesktop ? { width: '80%' } : undefined}
          >
            <TextField
              id="nu-filter-id"
              label={t('erru.nu.list.id')}
              value={draftFilters.businessCaseId ?? ''}
              onChange={(v) => setFilter('businessCaseId', v)}
            />
            <Select
              id="nu-filter-direction"
              label={t('erru.nu.list.direction')}
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
            <DateField
              key={`nu-date-from-${resetKey}`}
              id="nu-filter-date-from"
              label={t('erru.nu.filters.dateFrom')}
              selected={
                draftFilters.dateFrom
                  ? new Date(draftFilters.dateFrom)
                  : undefined
              }
              onSelect={(v) => setFilter('dateFrom', toIsoDate(v))}
              inputProps={{
                onClear: () => setFilter('dateFrom', ''),
                onChangeEvent: (event) => {
                  if (!event.target.value.trim()) setFilter('dateFrom', '');
                },
              }}
              placeholder={t('common.dateFieldPlaceholder')}
              monthYearSelectType="grid"
            />
            <DateField
              key={`nu-date-until-${resetKey}`}
              id="nu-filter-date-until"
              label={t('erru.nu.filters.dateUntil')}
              selected={
                draftFilters.dateUntil
                  ? new Date(draftFilters.dateUntil)
                  : undefined
              }
              onSelect={(v) => setFilter('dateUntil', toIsoDate(v))}
              inputProps={{
                onClear: () => setFilter('dateUntil', ''),
                onChangeEvent: (event) => {
                  if (!event.target.value.trim()) setFilter('dateUntil', '');
                },
              }}
              placeholder={t('common.dateFieldPlaceholder')}
              monthYearSelectType="grid"
            />
            <Select
              id="nu-filter-country"
              label={t('erru.nu.list.country')}
              options={[{ value: '', label: '\u00a0' }, ...countryOptions]}
              value={
                countryOptions.find((o) => o.value === draftFilters.country) ??
                null
              }
              onChange={(o) =>
                setFilter(
                  'country',
                  (o as { value?: string } | null)?.value ?? '',
                )
              }
            />
            <TextField
              id="nu-filter-first-name"
              label={t('erru.nu.list.tmFirstName')}
              value={draftFilters.tmFirstName ?? ''}
              onChange={(v) => setFilter('tmFirstName', v)}
            />
            <TextField
              id="nu-filter-family-name"
              label={t('erru.nu.list.tmFamilyName')}
              value={draftFilters.tmFamilyName ?? ''}
              onChange={(v) => setFilter('tmFamilyName', v)}
            />
            <Select
              id="nu-filter-status"
              label={t('erru.nu.list.status')}
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
            <TextField
              id="nu-filter-handler"
              label={t('erru.nu.list.handlerFilter')}
              value={draftFilters.handlerPersonalCode ?? ''}
              onChange={(v) => setFilter('handlerPersonalCode', v)}
            />
            <div className="filter-actions">
              <Button
                onClick={applyFilters}
                disabled={isLoading}
                isLoading={isLoading}
              >
                {t('common.search')}
              </Button>
              <Button visualType="secondary" onClick={resetFilters}>
                {t('common.clear')}
              </Button>
            </div>
          </div>

          <AppTable
            id="nu-table"
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
