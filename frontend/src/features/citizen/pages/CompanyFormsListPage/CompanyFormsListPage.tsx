import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { AppTable } from '../../../../shared/components/AppTable';
import { useAuth } from '../../../auth/AuthContext';
import { buildCitizenFormsColumns } from '../../citizenFormsColumns';
import { useCompanyFormsList } from './useCompanyFormsList';

/**
 * Read-only listing of the active company's published forms for a citizen
 * representative. No edit/delete affordances — citizen sessions are
 * strictly read-only.
 *
 * Legacy single-company/single-role view — retained as a deep link for
 * bookmarks/existing links; the citizen landing page is now
 * CitizenDashboardPage, which shows every represented company
 * and "Minu protokollid" at once instead of one activeRole-scoped list.
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
    () => buildCitizenFormsColumns(t, navigate),
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
          <Heading element="h1">{t('citizen.formsList.title')}</Heading>
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
          <Heading element="h1">{t('citizen.formsList.title')}</Heading>
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
            {t('citizen.formsList.title')}
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
