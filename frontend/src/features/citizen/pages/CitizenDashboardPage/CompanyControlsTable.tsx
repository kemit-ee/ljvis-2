import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import { Button, Text } from '@tedi-design-system/react/tedi';
import type { CompanyControlRow } from '../../types';

interface CompanyControlsTableProps {
  registryCode: string;
  /** Controls data fetched by the parent CompanyCard (avoids a duplicate API call). */
  controls: CompanyControlRow[];
  isLoading: boolean;
}

const columnHelper = createColumnHelper<CompanyControlRow>();

/**
 * Per-control MSI/VSI/SI/MI severity breakdown + weightedPoints,
 * shown under a CompanyCard's "Vaata kontrolle" toggle. Data is fetched by the
 * parent CompanyCard so the count shown in the card header and the rows shown
 * here are always consistent (same API response, same rolling window).
 */
export function CompanyControlsTable({
  registryCode,
  controls,
  isLoading,
}: CompanyControlsTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = useMemo(
    () => [
      columnHelper.accessor('formNumber', {
        header: t('citizen.dashboard.controls.formNumber'),
      }),
      columnHelper.accessor('mainDate', {
        header: t('citizen.dashboard.controls.mainDate'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('vehicleRegNr', {
        header: t('citizen.dashboard.controls.vehicleRegNr'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('msi', {
        header: t('citizen.dashboard.controls.msi'),
      }),
      columnHelper.accessor('vsi', {
        header: t('citizen.dashboard.controls.vsi'),
      }),
      columnHelper.accessor('si', {
        header: t('citizen.dashboard.controls.si'),
      }),
      columnHelper.accessor('mi', {
        header: t('citizen.dashboard.controls.mi'),
      }),
      columnHelper.accessor('weightedPoints', {
        header: t(
          'citizen.dashboard.controls.weightedPoints',
          'Kaalutud punktid',
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            visualType="link"
            onClick={() =>
              navigate(`/minu-ettevotte/compound/${row.original.compoundFormKey}`)
            }
          >
            {t('citizen.dashboard.controls.view')}
          </Button>
        ),
      }),
    ],
    [t, navigate],
  );

  if (isLoading) {
    return <Text color="secondary">{t('common.loading')}</Text>;
  }

  return (
    <Table
      id={`company-controls-table-${registryCode}`}
      className="ljvis-table"
      data={controls}
      columns={columns}
      placeholder={{ children: t('common.tableIsEmpty') }}
    />
  );
}
