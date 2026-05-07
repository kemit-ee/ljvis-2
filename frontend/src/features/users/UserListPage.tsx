import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import { Heading, Search, StatusBadge, Button } from '@tedi-design-system/react/tedi';
import type { UserListItem } from './types';
import { useUserList } from './hooks';
import { useAuth } from '../auth/AuthContext';

const columnHelper = createColumnHelper<UserListItem>();

export function UserListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const canAddUser = hasAnyPermission(['perm_user_edit_admin', 'perm_user_edit_local']);

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
  } = useUserList();

  const handleRowClick = useCallback(
    (row: UserListItem) => {
      navigate(`/users/${row.id}`);
    },
    [navigate],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('status', {
        header: t('users.status'),
        enableSorting: true,
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow) {
            return <div className="additional-group-row-marker"></div>;
          }
          const s = info.getValue();
          const color = s === 'active' ? 'success' : s === 'deactivating' ? 'warning' : 'neutral';
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
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow) return null;
          return (
            <span style={{ color: info.row.original.status === 'inactive' ? '#6b7280' : 'inherit' }}>
              {info.getValue()}
            </span>
          );
        },
      }),
      columnHelper.accessor('lastName', {
        header: t('users.lastName'),
        enableSorting: true,
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow) return null;
          return (
            <span style={{ color: info.row.original.status === 'inactive' ? '#6b7280' : 'inherit' }}>
              {info.getValue()}
            </span>
          );
        },
      }),
      columnHelper.accessor('personalCode', {
        header: t('users.personalCode'),
        enableSorting: false,
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow) return null;
          return (
            <span style={{ color: info.row.original.status === 'inactive' ? '#6b7280' : 'inherit' }}>
              {info.getValue()}
            </span>
          );
        },
      }),
      columnHelper.accessor('organisationName', {
        header: t('users.organisation'),
        enableSorting: true,
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow) return null;
          return (
            <span style={{ color: info.row.original.status === 'inactive' ? '#6b7280' : 'inherit' }}>
              {info.getValue()}
            </span>
          );
        },
      }),
      columnHelper.accessor('userGroups', {
        header: t('users.userGroups'),
        enableSorting: false,
        cell: (info) => {
          const group = info.getValue();
          if (!group) return <span style={{ color: info.row.original.status === 'inactive' ? '#6b7280' : 'inherit' }}>—</span>;
          return (
            <span style={{ color: info.row.original.status === 'inactive' ? '#6b7280' : 'inherit' }}>
              {group}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'viewDetails',
        header: '',
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow) return null;
          return (
            <div style={{ textAlign: 'center' }}>
              <a
                href={`/users/${info.row.original.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRowClick(info.row.original);
                }}
                style={{
                  color: 'primary',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {t('users.viewDetails')}
              </a>
            </div>
          );
        },
      }),
    ],
    [t, handleRowClick],
  );

  return (
    <div>
      <style>{`
        #users-table td,
        #users-table th {
          border-left: 1px solid #e5e7eb;
        }
        #users-table td:first-child,
        #users-table th:first-child {
          border-left: none;
        }
        #users-table tr:has(.additional-group-row-marker) {
          border-top: none;
        }
        #users-table tr:has(.additional-group-row-marker) td:nth-child(6) {
          border-top: 1px solid #e5e7eb;
        }
        #users-table td:last-child,
        #users-table th:last-child {
          width: 5% !important;
          max-width: 5% !important;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading element="h1">{t('users.title')}</Heading>
        {canAddUser && (
          <Button onClick={() => navigate('/users/new')}>{t('users.addUser')}
          </Button>
        )}
      </div>

      <div style={{ marginBottom: '1rem', maxWidth: '20rem' }}>
        <Search
          id="users-search"
          label={t('users.search')}
          value={searchInput}
          onIconClick={() => handleSearch(searchInput)}
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
        manualPagination
        manualSorting
        placeholder={{
            children: t('common.tableIsEmpty')
        }}
      />

    </div>
  );
}
