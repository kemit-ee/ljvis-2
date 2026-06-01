import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createColumnHelper } from '@tanstack/react-table';
import { Table } from '@tedi-design-system/react/community';
import {
  Heading,
  Search,
  StatusBadge,
  Button,
  Card,
  Text,
} from '@tedi-design-system/react/tedi';
import type { UserListItem } from '../../types';
import { useUserList } from '../../hooks';
import { useAuth } from '../../../auth/AuthContext';
import './UserListPage.module.css';

const columnHelper = createColumnHelper<UserListItem>();

export function UserListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const forbidden = !hasAnyPermission(['user.list.admin', 'user.list.local']);
  const canAddUser = hasAnyPermission(['user.edit.admin', 'user.edit.local']);
  const canViewUser = hasAnyPermission(['user.read.admin', 'user.read.local']);

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
          const color =
            s === 'active'
              ? 'success'
              : s === 'pending_deactivation'
                ? 'warning'
                : 'neutral';
          const label =
            s === 'active'
              ? t('users.statusActive')
              : s === 'pending_deactivation'
                ? t('users.statusDeactivating')
                : t('users.statusInactive');
          return (
            <StatusBadge variant="filled-bordered" color={color}>
              {label}
            </StatusBadge>
          );
        },
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
      columnHelper.accessor('userGroups', {
        header: t('users.userGroups'),
        enableSorting: false,
        cell: (info) => {
          const group = info.getValue()?.[0];
          if (!group)
            return (
              <span
                className={
                  info.row.original.status === 'inactive'
                    ? 'inactive-text'
                    : undefined
                }
              >
                —
              </span>
            );
          return (
            <span
              className={
                info.row.original.status === 'inactive'
                  ? 'inactive-text'
                  : undefined
              }
            >
              {group}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'viewDetails',
        header: '',
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow || !canViewUser)
            return null;
          return (
            <div className="cell-center">
              <a
                href={`/users/${info.row.original.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRowClick(info.row.original);
                }}
                className="table-link"
              >
                {t('users.viewDetails')}
              </a>
            </div>
          );
        },
      }),
    ],
    [t, handleRowClick, canViewUser],
  );

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <Card className="mt-05">
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">{t('users.title')}</Heading>
            {canAddUser && (
              <Button onClick={() => navigate('/users/new')}>
                {t('users.addUser')}
              </Button>
            )}
          </div>
          <div className="search-wrapper">
            <Search
              id="users-search"
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
              children: t('common.tableIsEmpty'),
            }}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
