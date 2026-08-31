import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { AppTable } from '../../../../shared/components/AppTable';
import { Button, Card, Heading, Select, Text, TextField } from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import { PERMISSIONS } from '../../../../constants/constants';
import type { RiskScoreListItem } from '../../types';
import { useRiskScoresList } from './useRiskScoresList';
import { RiskBandBadge } from './RiskBandBadge';

const columnHelper = createColumnHelper<RiskScoreListItem>();

const RISK_BAND_VALUES = ['Hall', 'Roheline', 'Kollane', 'Punane'] as const;

/**
 * LJVIS2-152: admin list of the latest risk score per Estonian transport
 * undertaking (EU 2022/695). Structure mirrors NcrListPage/CtudListPage —
 * a draft-filters-until-"Otsi" filter bar + a manually paginated/sorted
 * AppTable.
 */
export function RiskScoresListPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  const forbidden = !hasPermission(PERMISSIONS.RISK_REPORT_LIST);

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
  } = useRiskScoresList();

  const riskBandOptions = useMemo(
    () =>
      RISK_BAND_VALUES.map((code) => ({
        value: code,
        label: t(`riskScores.band${code}`),
      })),
    [t],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('companyName', {
        header: t('riskScores.companyName'),
        enableSorting: true,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('companyRegCode', {
        header: t('riskScores.companyRegCode'),
        enableSorting: false,
      }),
      columnHelper.accessor('riskScore', {
        header: t('riskScores.riskScore'),
        enableSorting: true,
        cell: (info) => {
          const v = info.getValue();
          return v == null ? '–' : v.toLocaleString('et-EE', { maximumFractionDigits: 2 });
        },
      }),
      columnHelper.accessor('riskBandCode', {
        header: t('riskScores.riskBand'),
        enableSorting: true,
        cell: (info) => <RiskBandBadge band={info.getValue()} />,
      }),
      columnHelper.accessor('totalControls', {
        header: t('riskScores.totalControls'),
        enableSorting: true,
      }),
    ],
    [t],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">{t('riskScores.title')}</Heading>
          </div>

          <div className="filter-bar">
            <TextField
              id="risk-scores-filter-company"
              label={t('riskScores.filterCompany')}
              value={draftFilters.companyName ?? ''}
              onChange={(v) => setFilter('companyName', v)}
            />
            <TextField
              id="risk-scores-filter-reg-code"
              label={t('riskScores.filterRegCode')}
              value={draftFilters.regCode ?? ''}
              onChange={(v) => setFilter('regCode', v)}
            />
            <Select
              id="risk-scores-filter-band"
              label={t('riskScores.filterRiskBand')}
              options={riskBandOptions}
              value={riskBandOptions.find((o) => o.value === draftFilters.riskBand) ?? null}
              onChange={(o) => setFilter('riskBand', (o as { value?: string } | null)?.value ?? '')}
            />
            <div className="filter-actions">
              <Button onClick={applyFilters}>{t('riskScores.search')}</Button>
              <Button visualType="secondary" onClick={resetFilters}>
                {t('riskScores.clear')}
              </Button>
            </div>
          </div>

          <AppTable
            id="risk-scores-table"
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
