import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppTable } from '../../../../shared/components/AppTable';
import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import { searchMyProtocols } from '../../api';
import type { CitizenFormRow } from '../../types';
import { buildCitizenFormsColumns } from '../../citizenFormsColumns';

/**
 * "Minu protokollid" section — every form where the logged-in
 * person appears as driver/punished person/good-repute subject, always
 * visible regardless of activeRole (a company representative who's also a
 * driver sees the same protocol here AND under the matching CompanyCard).
 */
export function MyProtocolsTable() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = useMemo(
    () => buildCitizenFormsColumns(t, navigate),
    [t, navigate],
  );

  const {
    data,
    totalRows,
    isLoading,
    pagination,
    setPagination,
    sorting,
    setSorting,
  } = usePaginatedList<CitizenFormRow>(searchMyProtocols, {
    defaultSort: 'main_date desc',
  });

  return (
    <AppTable
      id="citizen-my-protocols-table"
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
  );
}
