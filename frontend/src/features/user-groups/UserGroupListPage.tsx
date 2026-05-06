import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import { Heading, Search } from '@tedi-design-system/react/tedi';
import type { UserGroup } from './types';
import { useUserGroupList } from './hooks';
import { UserGroupFormModal } from './UserGroupFormModal';
import { useAuth } from '../auth/AuthContext';

const columnHelper = createColumnHelper<UserGroup>();

export function UserGroupListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, user, permissions } = useAuth();
  const canAddGroup = hasPermission('perm_user_group_edit_admin');

  const {
    data, totalRows, isLoading,
    pagination, setPagination,
    sorting, setSorting,
    searchInput, setSearchInput, handleSearch, clearSearch,
    refetch,
  } = useUserGroupList(user, permissions);

  const handleRowClick = useCallback(
    (row: UserGroup) => {
      navigate(`/user-groups/${row.id}`);
    },
    [navigate],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: t('userGroups.name'),
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow) {
            return <div className="additional-group-row-marker"></div>;
          }
          return info.getValue();
        },
      }),
      columnHelper.accessor('organisations', {
        header: t('userGroups.organisations'),
        cell: (info) => {
          if (info.row.original.coversAllOrganisations && !info.row.original.isAdditionalGroupRow) {
            return t('userGroups.allOrganisations');
          }
          return info.getValue() || '—';
        },
        enableSorting: false,
      }),
      columnHelper.display({
          id: 'viewDetails',
          header: '',
          cell: (info) => {
              if (info.row.original.isAdditionalGroupRow) return null;
              return (
                  <div style={{textAlign: 'center'}}>
                      <a
                          href={`/user-groups/${info.row.original.id}`}
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
                          {t('userGroups.viewDetails')}
                      </a>
                  </div>
              );
          },
      })
    ],
    [t, handleRowClick],
  );

  return (
    <div>
      <style>{`
        #user-groups-table td,
        #user-groups-table th {
          border-left: 1px solid #e5e7eb;
        }
        #user-groups-table td:first-child,
        #user-groups-table th:first-child {
          border-left: none;
        }
        #user-groups-table tr:has(.additional-group-row-marker) {
          border-top: none;
        }
        #user-groups-table tr:has(.additional-group-row-marker) td:nth-child(2) {
          border-top: 1px solid #e5e7eb;
        }
        #user-groups-table td:last-child,
        #user-groups-table th:last-child {
          width: 5% !important;
          max-width: 5% !important;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Heading element="h1">{t('userGroups.title')}</Heading>
        {canAddGroup && <UserGroupFormModal triggerLabel={t('userGroups.addGroup')} onSaved={refetch} />}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ maxWidth: '20rem' }}>
          <Search
            id="group-search"
            label={t('userGroups.search')}
            value={searchInput}
            onIconClick={() => handleSearch(searchInput)}
            onChange={setSearchInput}
            onSearch={handleSearch}
            onClear={clearSearch}
          />
        </div>
      </div>

      <Table
        id="user-groups-table"
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
