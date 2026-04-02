import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import { Heading, Search, StatusBadge } from '@tedi-design-system/react/tedi';
import type { UserListItem } from './types';
import { useUserList } from './hooks';
import { UserFormModal } from './UserFormModal';

const columnHelper = createColumnHelper<UserListItem>();

export function UserListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    data,
    totalRows,
    isLoading,
    pagination,
    setPagination,
    sorting,
    setSorting,
    searchInput,
    setSearchInput,
    handleSearch,
    clearSearch,
    refetch,
  } = useUserList();

  const columns = useMemo(
    () => [
      columnHelper.accessor('status', {
        header: t('users.status'),
        enableSorting: false,
        cell: (info) => {
          const s = info.getValue();
          const color = s === 'active' ? 'success' : s === 'deactivating' ? 'warning' : 'danger';
          const label =
            s === 'active' ? t('users.statusActive') :
            s === 'deactivating' ? t('users.statusDeactivating') :
            t('users.statusInactive');
          return <StatusBadge variant="filled-bordered" color={color}>{label}</StatusBadge>;
        },
      }),
      columnHelper.accessor('firstName', {
        header: t('users.firstName'),
        enableSorting: true,
      }),
      columnHelper.accessor('lastName', {
        header: t('users.lastName'),
        enableSorting: true,
      }),
      columnHelper.accessor('personalCode', {
        header: t('users.personalCode'),
        enableSorting: false,
      }),
      columnHelper.accessor('organisationName', {
        header: t('users.organisation'),
        enableSorting: true,
      }),
      columnHelper.accessor('userGroups', {
        header: t('users.userGroups'),
        enableSorting: false,
        cell: (info) => info.getValue() || '—',
      }),
    ],
    [t],
  );

  const handleRowClick = useCallback(
    (row: UserListItem) => {
      navigate(`/users/${row.id}`);
    },
    [navigate],
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading element="h1">{t('users.title')}</Heading>
        <UserFormModal triggerLabel={t('users.addUser')} onSaved={refetch} />
      </div>

      <div style={{ marginBottom: '1rem', maxWidth: '20rem' }}>
        <Search
          id="users-search"
          label={t('users.search')}
          value={searchInput}
          onChange={setSearchInput}
          onSearch={handleSearch}
          onClear={clearSearch}
        />
      </div>

      <Table
        id="users-table"
        data={data}
        columns={columns}
        isLoading={isLoading}
        totalRows={totalRows}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        onRowClick={handleRowClick}
        manualPagination
        manualSorting
      />

    </div>
  );
}
