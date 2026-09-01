import type { TFunction } from 'i18next';
import type { NavigateFunction } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Button, Tag } from '@tedi-design-system/react/tedi';
import { FORM_TYPE_META } from '../control-forms/pages/search/formSearchMeta';
import type { CitizenFormRow } from './types';

// DSL/Resql/ljvis/POST/citizen/forms/search.sql collapses every sub-form
// (sp_driver/sp_teammate/vehicle_technical/trailer_technical/adr/kv) into its
// parent 'compound' row before returning results — a citizen never sees a
// bare sub-form row, only compound/foreign_violation/labour_inspection/
// good_repute. Detail routes only need to cover those four.
export const COMPOUND_DETAIL_ROUTE = '/my-companies/compound';
export const DETAIL_ROUTE_BY_FORM_TYPE: Record<string, string> = {
  compound: COMPOUND_DETAIL_ROUTE,
  labour_inspection: '/my-companies/labour-inspection',
  foreign_violation: '/my-companies/foreign-violation',
  good_repute: '/my-companies/good-repute',
};

const columnHelper = createColumnHelper<CitizenFormRow>();

/**
 * Shared column set for the citizen-facing forms table — used by both
 * CompanyFormsListPage (legacy single-company view) and the dashboard's
 * MyProtocolsTable/CompanyControlsTable-adjacent listings, so
 * the detail-routing logic only lives in one place.
 */
export function buildCitizenFormsColumns(
  t: TFunction,
  navigate: NavigateFunction,
) {
  return [
    columnHelper.accessor('formType', {
      header: t('citizen.formsList.formType'),
      // Only mainDate/formNumber are actually sortable server-side (see
      // citizen/forms/search.sql's ORDER BY) — no sort arrows on the rest.
      enableSorting: false,
      cell: (info) => {
        const meta = FORM_TYPE_META[info.getValue()];
        return meta ? t(meta.labelKey) : info.getValue();
      },
    }),
    columnHelper.accessor('formNumber', {
      header: t('citizen.formsList.formNumber'),
      enableSorting: true,
    }),
    columnHelper.accessor('mainDate', {
      header: t('citizen.formsList.mainDate'),
      enableSorting: true,
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('vehicleRegNr', {
      header: t('citizen.formsList.vehicleRegNr'),
      enableSorting: false,
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('hasViolation', {
      header: t('citizen.formsList.hasViolation'),
      enableSorting: false,
      cell: (info) =>
        info.getValue() ? (
          <Tag color="danger">{t('citizen.formsList.yes')}</Tag>
        ) : (
          <Tag color="secondary">{t('citizen.formsList.no')}</Tag>
        ),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const basePath = DETAIL_ROUTE_BY_FORM_TYPE[row.original.formType];
        const targetId = row.original.formKey;
        if (!basePath || !targetId) return null;
        return (
          <Button
            visualType="link"
            onClick={() =>
              navigate(`${basePath}/${targetId}`, {
                state: { from: 'citizen-app' },
              })
            }
          >
            {t('citizen.formsList.view')}
          </Button>
        );
      },
    }),
  ];
}
