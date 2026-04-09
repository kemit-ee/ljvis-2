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
  const { hasPermission } = useAuth();
  const canAddGroup = hasPermission('perm_user_group_edit_admin');

  const {
    data, isLoading,
    searchInput, setSearchInput, handleSearch, clearSearch,
    orgSearchInput, setOrgSearchInput, handleOrgSearch, clearOrgSearch,
    refetch,
  } = useUserGroupList();

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: t('userGroups.name'),
      }),
      columnHelper.accessor('organisations', {
        header: t('userGroups.organisations'),
        cell: (info) => info.getValue() || '—',
      }),
    ],
    [t],
  );

  const handleRowClick = useCallback(
    (row: UserGroup) => {
      navigate(`/user-groups/${row.id}`);
    },
    [navigate],
  );

  return (
    <div>
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
            onChange={setSearchInput}
            onSearch={handleSearch}
            onClear={clearSearch}
          />
        </div>
        <div style={{ maxWidth: '20rem' }}>
          <Search
            id="group-org-search"
            label={t('userGroups.searchOrg')}
            value={orgSearchInput}
            onChange={setOrgSearchInput}
            onSearch={handleOrgSearch}
            onClear={clearOrgSearch}
          />
        </div>
      </div>

      <Table
        id="user-groups-table"
        data={data}
        columns={columns}
        isLoading={isLoading}
        hidePagination
        onRowClick={handleRowClick}
      />

    </div>
  );
}
