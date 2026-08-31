import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import {
  Heading,
  StatusBadge,
  Card,
  Text,
} from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import { formatDate } from '../../../../hooks/dateUtils';
import {
  FORM_READ_PERMISSIONS,
  FORM_STATUS_KEY,
} from '../../../../constants/constants';
import type { FormSearchRow } from '../../types';
import { useFormSearch } from './useFormSearch';
import { FormSearchFilters } from './FormSearchFilters';
import { FORM_TYPE_META, resolveFormRoute } from './formSearchMeta';
import './FormSearch.module.css';

const columnHelper = createColumnHelper<FormSearchRow>();

const statusColor = (status: string): 'success' | 'warning' | 'neutral' => {
  if (status === 'published') return 'success';
  if (status === 'confirmed') return 'warning';
  return 'neutral';
};

export function FormSearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const forbidden = !hasAnyPermission(FORM_READ_PERMISSIONS);

  const {
    draft,
    setField,
    applyFilters,
    clearFilters,
    data,
    totalRows,
    isLoading,
    pagination,
    setPagination,
    sorting,
    setSorting,
  } = useFormSearch();

  const openRow = useCallback(
    (row: FormSearchRow) => {
      // TRAM rows (compound + driver) both open the TRAM card by its
      // compound_form_key; every other type opens by its own form key.
      const key = row.formType.startsWith('tram_')
        ? (row.compoundFormKey ?? row.formKey)
        : row.formKey;
      navigate(resolveFormRoute(row.formType, key));
    },
    [navigate],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('formType', {
        header: t('search.columns.formType'),
        enableSorting: true,
        cell: (info) => {
          const meta = FORM_TYPE_META[info.getValue()];
          return (
            <span>
              {info.row.original.hasViolation && (
                <span className="row-has-violation" hidden />
              )}
              {meta ? t(meta.labelKey) : info.getValue()}
            </span>
          );
        },
      }),
      columnHelper.accessor('formNumber', {
        header: t('search.columns.formNumber'),
        enableSorting: true,
      }),
      columnHelper.accessor('status', {
        header: t('search.columns.status'),
        enableSorting: true,
        cell: (info) => {
          const s = info.getValue();
          const key = FORM_STATUS_KEY[s];
          return (
            <StatusBadge variant="filled-bordered" color={statusColor(s)}>
              {key ? t(key) : s}
            </StatusBadge>
          );
        },
      }),
      columnHelper.accessor('mainDate', {
        header: t('search.columns.mainDate'),
        enableSorting: true,
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('county', {
        header: t('search.columns.county'),
        enableSorting: false,
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('vehicleRegNr', {
        header: t('search.columns.vehicleRegNr'),
        enableSorting: false,
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('companyName', {
        header: t('search.columns.companyName'),
        enableSorting: true,
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('inspectorName', {
        header: t('search.columns.inspector'),
        enableSorting: false,
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.display({
        id: 'open',
        header: '',
        cell: (info) => (
          <a
            href={resolveFormRoute(
              info.row.original.formType,
              info.row.original.formKey,
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openRow(info.row.original);
            }}
            className="table-link"
          >
            {t('common.look')}
          </a>
        ),
      }),
    ],
    [t, openRow],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h1" className="mb-1">
            {t('search.title')}
          </Heading>
          <FormSearchFilters
            draft={draft}
            setField={setField}
            onSearch={applyFilters}
            onClear={clearFilters}
          />
          <Table
            id="form-search-table"
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
            placeholder={{
              children: t('common.tableIsEmpty'),
            }}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
