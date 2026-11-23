import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Button, InfoTooltip, Text } from '@tedi-design-system/react/tedi';
import type { CompanyControlRow } from '../../types';
import { formatDate } from '../../../../hooks/dateUtils';
import { AppTable } from '../../../../shared/components/AppTable';

interface CompanyControlsTableProps {
  registryCode: string;
  /** Controls data fetched by the parent CompanyCard (avoids a duplicate API call). */
  controls: CompanyControlRow[];
  isLoading: boolean;
}

const columnHelper = createColumnHelper<CompanyControlRow>();

/**
 * Column header with an explanatory tooltip — used for the severity
 * columns (MSI/VSI/SI/MI), since the raw
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
    <span className="ljvis-header-with-tooltip">
      {label}
      <InfoTooltip isSmall openWith="click">
        {tooltip}
      </InfoTooltip>
    </span>
  );
}

/**
 * Per-control MSI/VSI/SI/MI severity breakdown,
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
        cell: (info) => formatDate(info.getValue()),
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
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const paths: Partial<Record<CompanyControlRow['formType'], string>> = {
            compound: 'compound',
            foreign_violation: 'foreign-violation',
            labour_inspection: 'labour-inspection',
          };
          const basePath = paths[row.original.formType];
          if (!basePath) return null;
          return (
            <Button
              visualType="link"
              onClick={() => navigate(`/my-companies/${basePath}/${row.original.formKey}`, {
                state: { from: 'citizen-app' },
              })}
            >
              {t('citizen.dashboard.controls.view')}
            </Button>
          );
        },
      }),
    ],
    [t, navigate],
  );

  if (isLoading) {
    return <Text color="secondary">{t('common.loading')}</Text>;
  }

  return (
    <AppTable
      id={`company-controls-table-${registryCode}`}
      data={controls}
      columns={columns}
      placeholder={t('common.tableIsEmpty')}
    />
  );
}
