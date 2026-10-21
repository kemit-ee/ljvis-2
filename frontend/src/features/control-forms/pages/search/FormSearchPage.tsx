import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import {
  Button,
  Heading,
  StatusBadge,
  Card,
  Text,
} from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifiers } from '../../../classifiers/ClassifierProvider.tsx';
import { formatDate } from '../../../../hooks/dateUtils';
import {
  FORM_READ_PERMISSIONS,
  PERMISSIONS,
  FORM_STATUS_KEY,
} from '../../../../constants/constants';
import type { FormSearchRow } from '../../types';
import { exportSearchForms } from '../../api';
import {
  buildExportTable,
  downloadCsv,
  downloadXlsx,
  exportFilename,
} from './formExport';
import { useFormSearch } from './useFormSearch';
import { FormSearchFilters } from './FormSearchFilters';
import { FORM_TYPE_META, resolveFormRoute } from './formSearchMeta';
import './FormSearch.module.css';

/** Peab klappima DSL/Ruuter/ljvis/GET/v1/control-forms/search/export.yml max_rows väärtusega. */
const EXPORT_MAX_ROWS = 5000;

const columnHelper = createColumnHelper<FormSearchRow>();

const statusColor = (status: string): 'success' | 'warning' | 'neutral' => {
  if (status === 'published') return 'success';
  if (status === 'confirmed') return 'warning';
  return 'neutral';
};

export function FormSearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission, hasPermission } = useAuth();
  const forbidden = !hasAnyPermission(FORM_READ_PERMISSIONS);
  const { getByCode } = useClassifiers();

  // Vormid hoiavad maakonda ja linna/valda EHAK klassifikaatori väärtuse võtmena
  const placeNames = useMemo(
    () => new Map(getByCode('EHAK').map((e) => [String(e.classifierValueKey), e.name])),
    [getByCode],
  );
  const placeName = useCallback(
    (value: string) => placeNames.get(value) ?? value,
    [placeNames],
  );

  const {
    applied,
    draft,
    setField,
    applyFilters,
    clearFilters,
    resetKey,
    data,
    totalRows,
    isLoading,
    pagination,
    setPagination,
    sorting,
    setSorting,
  } = useFormSearch();

  const canExport = hasPermission(PERMISSIONS.FORM_EXPORT);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportDisabled =
    exporting || !applied.formType || totalRows === 0 || isLoading;

  const exportAll = useCallback(
    async (format: 'xlsx' | 'csv') => {
      setExporting(true);
      setExportError(null);
      try {
        const rows = await exportSearchForms(
          applied as unknown as Record<string, string>,
        );
        if (rows.length > EXPORT_MAX_ROWS) {
          setExportError(
            t('search.export.tooMany', { max: EXPORT_MAX_ROWS }),
          );
          return;
        }
        const table = buildExportTable(rows, placeName);
        const filename = exportFilename(applied.formType, format);
        if (format === 'xlsx') await downloadXlsx(table, filename);
        else downloadCsv(table, filename);
      } catch (e) {
        console.error('[FormSearchPage] export failed', e);
        setExportError(t('search.export.failed'));
      } finally {
        setExporting(false);
      }
    },
    [applied, t, placeName],
  );

  const openRow = useCallback(
    (row: FormSearchRow) => {
      navigate(resolveFormRoute(row.formType, row.formKey));
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
        cell: (info) => {
          const county = info.getValue();
          return county ? placeName(county) : '—';
        },
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
    [t, openRow, placeName],
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
            resetKey={resetKey}
          />
          {canExport && (
            <div className="mb-1">
              <Button
                visualType="secondary"
                disabled={exportDisabled}
                onClick={() => exportAll('xlsx')}
              >
                {t('search.export.xlsx')}
              </Button>{' '}
              <Button
                visualType="secondary"
                disabled={exportDisabled}
                onClick={() => exportAll('csv')}
              >
                {t('search.export.csv')}
              </Button>
              {!applied.formType && (
                <Text color="secondary">{t('search.export.pickType')}</Text>
              )}
              {exportError && <Text color="danger">{exportError}</Text>}
            </div>
          )}
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
