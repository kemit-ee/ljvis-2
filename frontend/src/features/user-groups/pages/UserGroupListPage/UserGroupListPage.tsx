import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import {
  Button,
  Card,
  Heading,
  Search,
  Text,
} from '@tedi-design-system/react/tedi';
import type { UserGroup } from '../../types';
import { useUserGroupList } from './useUserGroupList';
import { useAuth } from '../../../auth/AuthContext';
import './UserGroupListPage.module.css';

const columnHelper = createColumnHelper<UserGroup>();

export function UserGroupListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission } = useAuth();
  const forbidden = !hasAnyPermission([
    'user_group.list.admin',
    'user_group.list.local',
  ]);
  const canAddGroup = hasPermission('user_group.create');
  const canViewUserGroup = hasAnyPermission([
    'user_group.read.admin',
    'user_group.read.local',
  ]);

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
  } = useUserGroupList();

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
          if (
            info.row.original.coversAllOrganisations &&
            !info.row.original.isAdditionalGroupRow
          ) {
            return t('userGroups.allOrganisations');
          }
          return info.getValue()?.[0] || '—';
        },
        enableSorting: false,
      }),
      columnHelper.display({
        id: 'viewDetails',
        header: '',
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow || !canViewUserGroup)
            return null;
          return (
            <div className="cell-center">
              <a
                href={`/user-groups/${info.row.original.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRowClick(info.row.original);
                }}
                className="table-link"
              >
                {t('userGroups.viewDetails')}
              </a>
            </div>
          );
        },
      }),
    ],
    [t, handleRowClick, canViewUserGroup],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">
              {t('userGroups.titleAdministration')}
            </Heading>
            {canAddGroup && (
              <Button onClick={() => navigate('/user-groups/new')}>
                {t('userGroups.addGroup')}
              </Button>
            )}
          </div>
          <div className="grid-2col">
            <div className="search-wrapper">
              <Search
                id="group-search"
                label={t('common.search')}
                hideLabel
                value={searchInput}
                onIconClick={() => handleSearch(searchInput)}
                onChange={setSearchInput}
                onSearch={handleSearch}
                onClear={clearSearch}
                placeholder={t('common.search')}
              />
            </div>
          </div>
          <Table
            id="user-groups-table"
            className="ljvis-table"
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
              children: t('common.tableIsEmpty'),
            }}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
