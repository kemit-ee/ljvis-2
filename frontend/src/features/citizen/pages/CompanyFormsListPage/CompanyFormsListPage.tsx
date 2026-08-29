import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Button, Card, Heading, Text, Tag } from '@tedi-design-system/react/tedi';
import { AppTable } from '../../../../shared/components/AppTable';
import { useAuth } from '../../../auth/AuthContext';
import type { CitizenFormRow } from '../../types';
import { useCompanyFormsList } from './useCompanyFormsList';

// Sub-forms (sp_driver/sp_teammate/vehicle_technical/trailer_technical/adr/
// kv) carry no business data of their own — per forms.form_search's own
// docs, vehicle/company/driver/location/date are inherited from the parent
// compound_form — so they link to the *parent's* detail page via
// compoundFormKey, not their own formKey. Remaining types (adr/kv/
// vehicle_technical/trailer_technical as standalone detail pages, i.e. not
// just via their compound parent) don't have citizen detail endpoints yet.
const COMPOUND_DETAIL_ROUTE = '/minu-ettevotte/compound';
const DETAIL_ROUTE_BY_FORM_TYPE: Record<string, string> = {
  compound: COMPOUND_DETAIL_ROUTE,
  labour_inspection: '/minu-ettevotte/labour-inspection',
  foreign_violation: '/minu-ettevotte/foreign-violation',
  good_repute: '/minu-ettevotte/good-repute',
};
const SUB_FORM_TYPES = new Set([
  'sp_driver',
  'sp_teammate',
  'vehicle_technical',
  'trailer_technical',
  'adr',
  'kv',
]);

const columnHelper = createColumnHelper<CitizenFormRow>();

/**
 * Read-only listing of the active company's published forms for a citizen
 * representative. No edit/delete affordances — citizen sessions are
 * strictly read-only.
 */
export function CompanyFormsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const hasNoCompanies = (user?.representedCompanies?.length ?? 0) === 0;
  // citizen-self is a fully valid, self-contained scope (POST/v1/citizen/
  // forms/search.yml serves it directly) — this only guards the case where
  // representedCompanies is non-empty but the user hasn't picked a role yet
  // (e.g. right after login, before any switch/companies call has run).
  const noActiveCompany =
    user?.activeRole !== 'company' && user?.activeRole !== 'citizen-self';

  const columns = useMemo(
    () => [
      columnHelper.accessor('formType', {
        header: t('citizen.formsList.formType', 'Vormi tüüp'),
      }),
      columnHelper.accessor('formNumber', {
        header: t('citizen.formsList.formNumber', 'Vormi number'),
      }),
      columnHelper.accessor('mainDate', {
        header: t('citizen.formsList.mainDate', 'Kuupäev'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('vehicleRegNr', {
        header: t('citizen.formsList.vehicleRegNr', 'Sõiduki reg-nr'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('hasViolation', {
        header: t('citizen.formsList.hasViolation', 'Rikkumine'),
        cell: (info) =>
          info.getValue() ? (
            <Tag color="danger">{t('citizen.formsList.yes', 'Jah')}</Tag>
          ) : (
            <Tag color="secondary">{t('citizen.formsList.no', 'Ei')}</Tag>
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
              {t('citizen.formsList.view', 'Vaata')}
            </Button>
          );
        },
      }),
    ],
    [t, navigate],
  );

  // Hooks must run unconditionally — useCompanyFormsList always fetches, but
  // POST/v1/citizen/forms/search.yml itself rejects (400 NO_ACTIVE_COMPANY)
  // when there's no active company, which usePaginatedList surfaces as an
  // empty list. We short-circuit the UI before that request matters.
  const { data, totalRows, isLoading, pagination, setPagination, sorting, setSorting } =
    useCompanyFormsList();

  if (hasNoCompanies) {
    return (
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h1">{t('citizen.formsList.title', 'Minu ettevõte')}</Heading>
          <Text>
            {t(
              'citizen.formsList.noCompanies',
              'Teiega ei ole seotud ühtegi ettevõtet.',
            )}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  if (noActiveCompany) {
    return (
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h1">{t('citizen.formsList.title', 'Minu ettevõte')}</Heading>
          <Text>
            {t(
              'citizen.formsList.selectCompany',
              'Valige päisest ettevõte, mille andmeid soovite vaadata.',
            )}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="mt-05">
      <Card.Content>
        <div className="card-main">
          <Heading element="h1">
            {t('citizen.formsList.title', 'Minu ettevõte')}
          </Heading>
        </div>
        <AppTable
          id="citizen-forms-table"
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
  );
}
