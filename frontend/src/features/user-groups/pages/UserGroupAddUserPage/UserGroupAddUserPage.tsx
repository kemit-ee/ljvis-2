import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ModalProvider, Table } from '@tedi-design-system/react/community';
import {
  Button,
  Heading,
  Text,
  Search,
  Card,
  Checkbox,
  Separator,
} from '@tedi-design-system/react/tedi';
import { useUserGroupAddUser } from './useUserGroupAddUser';
import { useMemo } from 'react';
import type { UserGroupUser } from '../../types.ts';
import { createColumnHelper } from '@tanstack/react-table';
import './UserGroupAddUserPage.module.css';
import { useAuth } from '../../../auth/AuthContext';

const columnHelper = createColumnHelper<UserGroupUser>();

export function UserGroupAddUserPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, refetchUser } = useAuth();
  const forbidden = !hasPermission('user_group.add_user');

  const {
    group,
    availableUsers,
    loading,
    userSearchInput,
    setUserSearchInput,
    handleUserSearch,
    clearUserSearch,
    isLoading,
    totalRows,
    pagination,
    setPagination,
    sorting,
    setSorting,
    selectedUserIds,
    toggleUser,
    saveUsers,
  } = useUserGroupAddUser(id);

  const handleCancel = () => {
    navigate(`/user-groups/${id}`);
  };

  const handleSave = async () => {
    await saveUsers();
    await refetchUser();
    navigate(`/user-groups/${id}`, { state: { justCreatedUser: true } });
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () => <div></div>,
        cell: (info) => (
          <Checkbox
            id={`org-select-${info.row.original.id}`}
            label={t('common.space')}
            hideLabel
            size="large"
            value={info.row.original.id}
            name="organisations"
            checked={selectedUserIds.has(info.row.original.id)}
            onChange={() => toggleUser(info.row.original.id)}
          />
        ),
      }),
      columnHelper.accessor('firstName', {
        header: t('users.firstName'),
        enableSorting: true,
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow) return null;
          return (
            <span
              className={
                info.row.original.status === 'inactive'
                  ? 'inactive-text'
                  : undefined
              }
            >
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
            <span
              className={
                info.row.original.status === 'inactive'
                  ? 'inactive-text'
                  : undefined
              }
            >
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
            <span
              className={
                info.row.original.status === 'inactive'
                  ? 'inactive-text'
                  : undefined
              }
            >
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
            <span
              className={
                info.row.original.status === 'inactive'
                  ? 'inactive-text'
                  : undefined
              }
            >
              {info.getValue()}
            </span>
          );
        },
      }),
    ],
    [t, selectedUserIds, toggleUser],
  );

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!group) return <Text>{t('common.error')}</Text>;

  return (
    <ModalProvider>
      <div>
        <Button
          visualType="link"
          onClick={() => navigate(`/user-groups/${id}`)}
          iconLeft="arrow_back"
        >
          {t('common.back')}
        </Button>

        <Heading className="page-header" element="h1">
          {group.name}
        </Heading>

        <Card className="mt-05">
          <Card.Content>
            <div className="card-main">
              <Heading modifiers="h3" color="secondary">
                {t('userGroups.addUsersTitle')}
              </Heading>
            </div>
            <Separator spacing={1} isStretched={true} />
            <div className="grid-2col">
              <div className="search-wrapper">
                <Search
                  id="user-groupusers-search"
                  label={t('common.search')}
                  hideLabel
                  value={userSearchInput}
                  onIconClick={() => handleUserSearch(userSearchInput)}
                  onChange={setUserSearchInput}
                  onSearch={handleUserSearch}
                  onClear={clearUserSearch}
                  placeholder={t('common.search')}
                />
              </div>
            </div>

            <Table
              id="users-table"
              className="ljvis-table"
              data={availableUsers}
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
            <div className="form-actions">
              <Button
                type="button"
                size="small"
                visualType="link"
                onClick={handleCancel}
              >
                {t('userGroups.cancel')}
              </Button>
              <Button onClick={handleSave} size="small">
                {t('userGroups.save')}
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    </ModalProvider>
  );
}
