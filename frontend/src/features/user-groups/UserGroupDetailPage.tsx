import {useParams, useNavigate, useLocation} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Accordion,
    AccordionItem,
    AccordionItemContent,
    AccordionItemHeader,
    CardContent,
    Modal,
    ModalCloser,
    ModalProvider,
    ModalTrigger,
    Table
} from '@tedi-design-system/react/community';
import {
    Button,
    Heading,
    Text,
    Checkbox,
    Search,
    StatusBadge,
    Card,
    Icon,
    Tooltip, Alert
} from '@tedi-design-system/react/tedi';
import { useUserGroupDetail } from './hooks';
import { useAuth } from '../auth/AuthContext';
import {useCallback, useMemo, useState} from "react";
import type {UserListItem} from "../users/types.ts";
import {createColumnHelper} from "@tanstack/react-table";
import type {Organisation} from "../organisations/types.ts";
import type {Permission} from "../permissions/types.ts";
import { UserGroupNameEditor } from './UserGroupNameEditor';
import { UserGroupOrgsEditor } from './UserGroupOrgsEditor';
import { UserGroupPermsEditor } from './UserGroupPermsEditor';

const userColumnHelper = createColumnHelper<UserListItem>();
const orgColumnHelper = createColumnHelper<Organisation>();
const permColumnHelper = createColumnHelper<Permission>();

export function UserGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEditGroup = hasPermission('perm_user_group_edit_admin');
  const canViewUsers = hasPermission('perm_user_group_view_admin') || hasPermission('perm_user_group_view_local');
  const location = useLocation();
  const justCreated = (location.state as { justCreated?: boolean })?.justCreated;
  const justCreatedUser = (location.state as { justCreatedUser?: boolean })?.justCreatedUser;
  const [showNewUserAddedAlert, setShowNewUserAddedAlert] = useState(!!justCreatedUser);
  const defaultOpenItems = justCreated ? ['block-name', 'block-orgs', 'block-perms'] : [];

  const {
    group, orgs, perms, users, loading,
    userSearchInput, setUserSearchInput, handleUserSearch, clearUserSearch,
    editingName, editName, setEditName, startEditName, saveName, cancelEditName,
    editingOrgs, allOrgs, selectedOrgIds, startEditOrgs, toggleOrg, toggleAllOrgs, saveOrgs, cancelEditOrgs,
    editingPerms, allPerms, selectedPermIds, startEditPerms, togglePerm, toggleAllPerms, savePerms, cancelEditPerms,
    handleDeleteUser,
    isLoading, totalRows, pagination, setPagination, sorting, setSorting, nameError, organisationsError,
    forbidden
  } = useUserGroupDetail(id);

  const handleRowClick = useCallback(
      (row: UserListItem) => {
        navigate(`/users/${row.id}`);
      },
      [navigate],
  );

    const orgColumns = useMemo(
        () => [
            orgColumnHelper.display({
                id: 'select',
                header: (
                    <Checkbox
                        id="org-select-all"
                        label=" "
                        size='large'
                        checked={allOrgs.length > 0 && selectedOrgIds.size === allOrgs.length}
                        onChange={() => toggleAllOrgs()}
                    />
                ),
                cell: (info) => (
                    <Checkbox
                        id={`org-select-${info.row.original.id}`}
                        label=" "
                        size='large'
                        value={info.row.original.id}
                        name="organisations"
                        checked={selectedOrgIds.has(info.row.original.id)}
                        onChange={() => toggleOrg(info.row.original.id)}
                    />
                ),
            }),
            orgColumnHelper.accessor('name', {
                header: t('userGroups.organisations'),
                enableSorting: false,
            }),
        ],
        [t, selectedOrgIds, toggleOrg, allOrgs, toggleAllOrgs],
    );

    const permColumns = useMemo(
        () => [
            permColumnHelper.display({
                id: 'select',
                header: (
                    <Checkbox
                        id="perm-select-all"
                        label=" "
                        size='large'
                        checked={allPerms.length > 0 && selectedPermIds.size === allPerms.length}
                        onChange={() => toggleAllPerms()}
                    />
                ),
                cell: (info) => (
                    <Checkbox
                        id={`perm-select-${info.row.original.id}`}
                        label=" "
                        size='large'
                        value={info.row.original.id}
                        name="permissions"
                        checked={selectedPermIds.has(info.row.original.id)}
                        onChange={() => togglePerm(info.row.original.id)}
                    />
                ),
            }),
            permColumnHelper.accessor('name', {
                header: t('userGroups.organisations'),
                cell: (info) => `${info.row.original.description}`,
                enableSorting: false,
            }),
        ],
        [t, selectedPermIds, togglePerm, allPerms, toggleAllPerms],
    );

  const userColumns = useMemo(
      () => [
        userColumnHelper.accessor('firstName', {
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
        userColumnHelper.accessor('lastName', {
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
        userColumnHelper.accessor('personalCode', {
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
        userColumnHelper.accessor('organisationName', {
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
        userColumnHelper.accessor('status', {
            header: t('users.status'),
            enableSorting: false,
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
        userColumnHelper.display({
          id: 'viewDetails',
          header: '',
          cell: (info) => {
            if (info.row.original.isAdditionalGroupRow) return null;
            return (
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {canEditGroup && ( <Tooltip>
                      <Tooltip.Trigger>
                          <ModalTrigger>
                              <Icon name="delete" color="danger" size={24} style={{ cursor: 'pointer' }}/>
                          </ModalTrigger>
                          <Modal aria-labelledby="delete-confirm-title">
                              <CardContent>
                                  <Heading element="h2" id="delete-confirm-title">{t('userGroups.deleteUser')}</Heading>
                                  <div style={{ marginTop: '1rem' }}><Text>{t('userGroups.deleteUserConfirm')}</Text></div>
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                      <ModalCloser>
                                          <Button visualType="secondary">{t('common.no')}</Button>
                                      </ModalCloser>
                                      <ModalCloser>
                                          <Button color="danger" onClick={() => handleDeleteUser(info.row.original.id)}>
                                              {t('common.yes')}
                                          </Button>
                                      </ModalCloser>
                                  </div>
                              </CardContent>
                          </Modal>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                          {t('common.remove')}
                      </Tooltip.Content>
                    </Tooltip>
                    )}
                    {canViewUsers && (<Tooltip>
                      <Tooltip.Trigger>
                          <Icon name="visibility" color="brand" size={24} style={{ cursor: 'pointer' }} onClick={() => handleRowClick(info.row.original)}/>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                          {t('common.look')}
                      </Tooltip.Content>
                    </Tooltip>
                    )}
                </div>
            );
          },
        }),
      ],
      [t, handleRowClick, handleDeleteUser, canEditGroup, canViewUsers],
  );

  if (loading) return <Text>{t('common.loading')}</Text>;
    if (forbidden) return <Text>{t('common.forbidden')}</Text>;
    if (!group) return <Text>{t('common.error')}</Text>;

  return (
    <ModalProvider>
    <div>
        {showNewUserAddedAlert && (
            <div style={{ marginBottom: '1rem' }}>
                <Alert
                    icon="check_circle"
                    onClose={() => setShowNewUserAddedAlert(false)}
                    type="success"
                    size="small"
                >
                    {t('users.newUserAddedNote')}
                </Alert>
            </div>
        )}
        <style>{`
        #users-table td,
        #users-table th {
          border-left: 1px solid #e5e7eb;
        }
        #users-table td:first-child,
        #users-table th:first-child {
          border-left: none;
        }
        #users-table td:last-child,
        #users-table th:last-child {
          width: 5% !important;
          max-width: 5% !important;
        }
        #organisations-table td:first-child,
        #organisations-table th:first-child,
        #permissions-table td:first-child,
        #permissons-table th:first-child    
         {
          width: 1% !important;
        }
        #organisations-table td:nth-child(2),
        #organisations-table th:nth-child(2),
        #permissions-table td:nth-child(2),
        #permissions-table th:nth-child(2) {
          padding-left: 0 !important;
        }
        #permissions-table th:nth-child(2) {
          justify-items: start !important;
        }
      `}</style>
      <Button visualType="link" onClick={() => navigate('/user-groups')} iconLeft="arrow_back">
        {t('common.back')}
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
        <Heading element="h1">{group.name}</Heading>
      </div>

      <Accordion defaultOpenItem={defaultOpenItems}>
        {/* Block 1 – Name */}
        <AccordionItem id="block-name">
          <AccordionItemHeader
              closeText={t('common.close')}
              openText={t('common.look')}
          >
            <Heading modifiers="h3">{t('userGroups.data')}</Heading>
          </AccordionItemHeader>
          <AccordionItemContent>
            <UserGroupNameEditor
                editingName={editingName}
                editName={editName}
                setEditName={setEditName}
                nameError={nameError}
                currentName={group.name}
                canEdit={canEditGroup}
                onStartEdit={startEditName}
                onSave={saveName}
                onCancel={cancelEditName}
            />
          </AccordionItemContent>
        </AccordionItem>

        {/* Block 2 – Organisations */}
        <AccordionItem id="block-orgs">
          <AccordionItemHeader
              closeText={t('common.close')}
              openText={t('common.look')}
          >
            <Heading modifiers="h3">{t('userGroups.connectedOrganisations')}</Heading>
          </AccordionItemHeader>
          <AccordionItemContent>
            <UserGroupOrgsEditor
                editingOrgs={editingOrgs}
                allOrgs={allOrgs}
                orgColumns={orgColumns}
                organisationsError={organisationsError}
                orgs={orgs}
                canEdit={canEditGroup}
                onStartEdit={startEditOrgs}
                onSave={saveOrgs}
                onCancel={cancelEditOrgs}
            />
          </AccordionItemContent>
        </AccordionItem>

        {/* Block 3 – Permissions */}
        <AccordionItem id="block-perms">
          <AccordionItemHeader
              closeText={t('common.close')}
              openText={t('common.look')}
          >
            <Heading modifiers="h3">{t('userGroups.groupPermissions')}</Heading>
          </AccordionItemHeader>
          <AccordionItemContent>
            <UserGroupPermsEditor
                editingPerms={editingPerms}
                allPerms={allPerms}
                permColumns={permColumns}
                perms={perms}
                canEdit={canEditGroup}
                onStartEdit={startEditPerms}
                onSave={savePerms}
                onCancel={cancelEditPerms}
            />
          </AccordionItemContent>
        </AccordionItem>
      </Accordion>

      <Card style={{marginTop: '0.5rem'}}>
          <Card.Content>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <Heading modifiers="h3" color="secondary" style={{marginBottom: '1rem'}}>
                      {t('userGroups.users')}
                  </Heading>
                  {canEditGroup && (
                      <Button onClick={() => navigate(`/user-groups/${id}/add-user`)}>{t('userGroups.addUser')}
                      </Button>
                  )}
              </div>
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
                  data={users}
                  columns={userColumns}
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
          </Card.Content>
      </Card>
    </div>
    </ModalProvider>
  );
}
