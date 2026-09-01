import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import { Button, Icon, Text, Tooltip } from '@tedi-design-system/react/tedi';
import type { CompanyControlRow } from '../../types';

interface CompanyControlsTableProps {
  registryCode: string;
  /** Controls data fetched by the parent CompanyCard (avoids a duplicate API call). */
  controls: CompanyControlRow[];
  isLoading: boolean;
}

const columnHelper = createColumnHelper<CompanyControlRow>();

/**
 * Column header with an explanatory tooltip — used for the severity
 * columns (Huligaansõit/Väga tõsine/Tõsine/Vähemtõsine), since the raw
 * EU classifier abbreviations (MSI/VSI/SI/MI) mean nothing to a citizen
 * without transport-sector background.
 */
function HeaderWithTooltip({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <Tooltip.Trigger>
        <span className="ljvis-header-with-tooltip">
          {label} <Icon name="info" size={16} color="secondary" />
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content>{tooltip}</Tooltip.Content>
    </Tooltip>
  );
}

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
        header: () => (
          <HeaderWithTooltip
            label={t('citizen.dashboard.controls.msi')}
            tooltip={t('citizen.dashboard.controls.msiTooltip')}
          />
        ),
      }),
      columnHelper.accessor('vsi', {
        header: () => (
          <HeaderWithTooltip
            label={t('citizen.dashboard.controls.vsi')}
            tooltip={t('citizen.dashboard.controls.vsiTooltip')}
          />
        ),
      }),
      columnHelper.accessor('si', {
        header: () => (
          <HeaderWithTooltip
            label={t('citizen.dashboard.controls.si')}
            tooltip={t('citizen.dashboard.controls.siTooltip')}
          />
        ),
      }),
      columnHelper.accessor('mi', {
        header: () => (
          <HeaderWithTooltip
            label={t('citizen.dashboard.controls.mi')}
            tooltip={t('citizen.dashboard.controls.miTooltip')}
          />
        ),
      }),
      columnHelper.accessor('weightedPoints', {
        header: () => (
          <HeaderWithTooltip
            label={t(
              'citizen.dashboard.controls.weightedPoints',
              'Kaalutud punktid',
            )}
            tooltip={t('citizen.dashboard.controls.weightedPointsTooltip')}
          />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            visualType="link"
            onClick={() =>
              navigate(`/my-companies/compound/${row.original.compoundFormKey}`, {
                state: { from: 'citizen-app' },
              })
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
