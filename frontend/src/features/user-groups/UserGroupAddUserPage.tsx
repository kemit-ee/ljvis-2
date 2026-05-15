import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ModalProvider,
    Table
} from '@tedi-design-system/react/community';
import {
    Button,
    Heading,
    Text,
    Search,
    Card,
    Checkbox,
    Separator
} from '@tedi-design-system/react/tedi';
import { useUserGroupAddUser } from './hooks';
import { useMemo} from "react";
import type {UserListItem} from "../users/types.ts";
import {createColumnHelper} from "@tanstack/react-table";

const columnHelper = createColumnHelper<UserListItem>();

export function UserGroupAddUserPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    group, availableUsers, loading,
    userSearchInput, setUserSearchInput, handleUserSearch, clearUserSearch,
    isLoading, totalRows, pagination, setPagination, sorting, setSorting, selectedUserIds, toggleUser, saveUsers
  } = useUserGroupAddUser(id);

  const handleCancel = () => {
    navigate(`/user-groups/${id}`);
  };

  const handleSave = () => {
    saveUsers();
    navigate(`/user-groups/${id}`, { state: { justCreatedUser: true } });
  };


  const columns = useMemo(
      () => [
        columnHelper.display({
            id: 'select',
            header: (
                <div></div>
            ),
            cell: (info) => (
                <Checkbox
                    id={`org-select-${info.row.original.id}`}
                    label=" "
                    size='large'
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
      ],
      [t, selectedUserIds, toggleUser],
  );

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (!group) return <Text>{t('common.error')}</Text>;

  return (
    <ModalProvider>
    <div>
        <style>{`
        #users-table td,
        #users-table th {
          border-left: 1px solid #e5e7eb;
        }
        #users-table td:first-child,
        #users-table th:first-child {
          border-left: none;
          width: 1% !important;
        }
        #users-table td:last-child,
        #users-table th:last-child {
          width: 5% !important;
          max-width: 5% !important;
        }
      `}</style>
      <Button visualType="link" onClick={() => navigate(`/user-groups/${id}`)} iconLeft="arrow_back">
        {t('common.back')}
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
        <Heading element="h1">{group.name}</Heading>
      </div>

      <Card style={{marginTop: '0.5rem'}}>
          <Card.Content>
              <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
              }}>
                  <Heading modifiers="h3" color="secondary">{t('userGroups.addUsersTitle')}</Heading>
              </div>
              <Separator spacing={1} isStretched={true} />
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div style={{marginBottom: '1rem', maxWidth: '25rem'}}>
                      <Search
                          id="user-groupusers-search"
                          label=" "
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
                      children: t('common.tableIsEmpty')
                  }}
              />
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <Button
                      type="button"
                      size="small"
                      visualType="link"
                      onClick={handleCancel}
                  >
                      {t('userGroups.cancel')}
                  </Button>
                  <Button onClick={handleSave}
                          size="small"
                  >
                      {t('userGroups.save')}
                  </Button>
              </div>
          </Card.Content>
      </Card>

    </div>
    </ModalProvider>
  );
}
