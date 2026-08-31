import type { TFunction } from 'i18next';
import type { NavigateFunction } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Button, Tag } from '@tedi-design-system/react/tedi';
import type { CitizenFormRow } from './types';

// Sub-forms (sp_driver/sp_teammate/vehicle_technical/trailer_technical/adr/
// kv) carry no business data of their own — per forms.form_search's own
// docs, vehicle/company/driver/location/date are inherited from the parent
// compound_form — so they link to the *parent's* detail page via
// compoundFormKey, not their own formKey. Remaining types (adr/kv/
// vehicle_technical/trailer_technical as standalone detail pages, i.e. not
// just via their compound parent) don't have citizen detail endpoints yet.
export const COMPOUND_DETAIL_ROUTE = '/minu-ettevotte/compound';
export const DETAIL_ROUTE_BY_FORM_TYPE: Record<string, string> = {
  compound: COMPOUND_DETAIL_ROUTE,
  labour_inspection: '/minu-ettevotte/labour-inspection',
  foreign_violation: '/minu-ettevotte/foreign-violation',
  good_repute: '/minu-ettevotte/good-repute',
};
export const SUB_FORM_TYPES = new Set([
  'sp_driver',
  'sp_teammate',
  'vehicle_technical',
  'trailer_technical',
  'adr',
  'kv',
]);

const columnHelper = createColumnHelper<CitizenFormRow>();

/**
 * Shared column set for the citizen-facing forms table — used by both
 * CompanyFormsListPage (legacy single-company view) and the dashboard's
 * MyProtocolsTable/CompanyControlsTable-adjacent listings, so
 * the detail-routing logic (compound vs. sub-form vs. standalone types)
 * only lives in one place.
 */
export function buildCitizenFormsColumns(
  t: TFunction,
  navigate: NavigateFunction,
) {
  return [
    columnHelper.accessor('formType', {
      header: t('citizen.formsList.formType'),
    }),
    columnHelper.accessor('formNumber', {
      header: t('citizen.formsList.formNumber'),
    }),
    columnHelper.accessor('mainDate', {
      header: t('citizen.formsList.mainDate'),
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('vehicleRegNr', {
      header: t('citizen.formsList.vehicleRegNr'),
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('hasViolation', {
      header: t('citizen.formsList.hasViolation'),
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
        const isSubForm = SUB_FORM_TYPES.has(row.original.formType);
        const basePath = isSubForm
          ? COMPOUND_DETAIL_ROUTE
          : DETAIL_ROUTE_BY_FORM_TYPE[row.original.formType];
        const targetId = isSubForm
          ? row.original.compoundFormKey
          : row.original.formKey;
        if (!basePath || !targetId) return null;
        return (
          <Button
            visualType="link"
            onClick={() => navigate(`${basePath}/${targetId}`)}
          >
            {t('citizen.formsList.view')}
          </Button>
        );
      },
    }),
  ];
}
