import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  Table,
} from '@tedi-design-system/react/community';
import {
  Button,
  Heading,
  Text,
  Checkbox,
  Search,
  StatusBadge,
  Card,
  Alert,
} from '@tedi-design-system/react/tedi';
import { useUserGroupDetail } from './useUserGroupDetail';
import { useAuth } from '../../../auth/AuthContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UserGroupUser } from '../../types';
import { createColumnHelper } from '@tanstack/react-table';
import type { Organisation } from '../../../organisations/types.ts';
import type { Permission } from '../../../permissions/types.ts';
import { UserGroupNameEditor } from '../../components/UserGroupNameEditor';
import { UserGroupOrgsEditor } from '../../components/UserGroupOrgsEditor';
import { UserGroupPermsEditor } from '../../components/UserGroupPermsEditor';

const userColumnHelper = createColumnHelper<UserGroupUser>();
const orgColumnHelper = createColumnHelper<Organisation>();
const permColumnHelper = createColumnHelper<Permission>();

export function UserGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission, refetchUser } = useAuth();
  const canEditGroup = hasPermission('user_group.update');
  const canAddUser = hasPermission('user_group.add_user');
  const canRemoveUser = hasPermission('user_group.remove_user');
  const canViewUser = hasAnyPermission(['user.read.admin', 'user.read.local']);
  const forbidden = !hasAnyPermission([
    'user_group.read.admin',
    'user_group.read.local',
  ]);
  const location = useLocation();
  const justCreated = (location.state as { justCreated?: boolean })
    ?.justCreated;
  const justCreatedUser = (location.state as { justCreatedUser?: boolean })
    ?.justCreatedUser;
  const [showNewUserAddedAlert, setShowNewUserAddedAlert] =
    useState(!!justCreatedUser);
  const defaultOpenItems = justCreated
    ? ['block-name', 'block-orgs', 'block-perms']
    : [];

  useEffect(() => {
    if (showNewUserAddedAlert) {
      const timer = setTimeout(() => {
        setShowNewUserAddedAlert(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showNewUserAddedAlert]);

  const {
    group,
    orgs,
    perms,
    users,
    loading,
    userSearchInput,
    setUserSearchInput,
    handleUserSearch,
    clearUserSearch,
    editingName,
    editName,
    setEditName,
    startEditName,
    saveName,
    cancelEditName,
    editingOrgs,
    allOrgs,
    selectedOrgIds,
    startEditOrgs,
    toggleOrg,
    toggleAllOrgs,
    saveOrgs: saveOrgsHook,
    cancelEditOrgs,
    editingPerms,
    allPerms,
    selectedPermIds,
    startEditPerms,
    togglePerm,
    toggleAllPerms,
    savePerms: savePermsHook,
    cancelEditPerms,
    handleDeleteUser: handleDeleteUserHook,
    isLoading,
    totalRows,
    pagination,
    setPagination,
    sorting,
    setSorting,
    nameError,
    organisationsError,
  } = useUserGroupDetail(id);

  const savePerms = async () => {
    await savePermsHook();
    await refetchUser();
  };

  const saveOrgs = async () => {
    const ok = await saveOrgsHook();
    if (ok === false) return;
    await refetchUser();
  };

  const handleDeleteUser = async (userId: string) => {
    await handleDeleteUserHook(userId);
    await refetchUser();
  };

  const handleRowClick = useCallback(
    (row: UserGroupUser) => {
      navigate(`/users/${row.id}`);
    },
    [navigate],
  );

  const orgColumns = useMemo(
    () => [
      orgColumnHelper.display({
        id: 'select',
        header: () => (
          <Checkbox
            id="org-select-all"
            label={t('common.space')}
            hideLabel
            size="large"
            value="all"
            name="org-select-all"
            checked={
              allOrgs.length > 0 && selectedOrgIds.size === allOrgs.length
            }
            onChange={() => toggleAllOrgs()}
          />
        ),
        cell: (info) => (
          <Checkbox
            id={`org-select-${info.row.original.id}`}
            label={t('common.space')}
            hideLabel
            size="large"
            value={String(info.row.original.id)}
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
        header: () => (
          <Checkbox
            id="perm-select-all"
            label={t('common.space')}
            hideLabel
            value="all"
            name="perm-select-all"
            size="large"
            checked={
              allPerms.length > 0 && selectedPermIds.size === allPerms.length
            }
            onChange={() => toggleAllPerms()}
          />
        ),
        cell: (info) => (
          <Checkbox
            id={`perm-select-${info.row.original.id}`}
            label={t('common.space')}
            hideLabel
            size="large"
            value={String(info.row.original.id)}
            name="permissions"
            checked={selectedPermIds.has(info.row.original.id)}
            onChange={() => togglePerm(info.row.original.id)}
          />
        ),
      }),
      permColumnHelper.accessor('description', {
        header: t('userGroups.permissions'),
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
          const value = info.getValue();
          return (
            <span
              className={
                info.row.original.status === 'inactive'
                  ? 'inactive-text'
                  : undefined
              }
            >
              {canViewUser ? (
                <a
                  href={`/users/${info.row.original.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRowClick(info.row.original);
                  }}
                  className="table-link"
                >
                  {value}
                </a>
              ) : (
                value
              )}
            </span>
          );
        },
      }),
      userColumnHelper.accessor('lastName', {
        header: t('users.lastName'),
        enableSorting: true,
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow) return null;
          const value = info.getValue();
          return (
            <span
              className={
                info.row.original.status === 'inactive'
                  ? 'inactive-text'
                  : undefined
              }
            >
              {canViewUser ? (
                <a
                  href={`/users/${info.row.original.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRowClick(info.row.original);
                  }}
                  className="table-link"
                >
                  {value}
                </a>
              ) : (
                value
              )}
            </span>
          );
        },
      }),
      userColumnHelper.accessor('personalCode', {
        header: t('users.personalCode'),
        enableSorting: false,
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow) return null;
          const value = info.getValue();
          return (
            <span
              className={
                info.row.original.status === 'inactive'
                  ? 'inactive-text'
                  : undefined
              }
            >
              {canViewUser ? (
                <a
                  href={`/users/${info.row.original.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRowClick(info.row.original);
                  }}
                  className="table-link"
                >
                  {value}
                </a>
              ) : (
                value
              )}
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
      userColumnHelper.accessor('status', {
        header: t('users.status'),
        enableSorting: false,
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
      userColumnHelper.display({
        id: 'viewDetails',
        header: '',
        cell: (info) => {
          if (info.row.original.isAdditionalGroupRow) return null;
          return (
            <div>
              {canRemoveUser && (
                <ModalProvider>
                  <ModalTrigger>
                    <a className="table-link danger-text">
                      {t('common.remove')}
                    </a>
                  </ModalTrigger>
                  <Modal aria-labelledby="delete-confirm-title">
                    <CardContent>
                      <Heading element="h2" id="delete-confirm-title">
                        {t('userGroups.deleteUser')}
                      </Heading>
                      <div className="mt-1">
                        <Text>{t('userGroups.deleteUserConfirm')}</Text>
                      </div>
                      <div className="modal-actions">
                        <ModalCloser>
                          <Button visualType="secondary">
                            {t('common.no')}
                          </Button>
                        </ModalCloser>
                        <ModalCloser>
                          <Button
                            color="danger"
                            onClick={() =>
                              handleDeleteUser(info.row.original.id)
                            }
                          >
                            {t('common.yes')}
                          </Button>
                        </ModalCloser>
                      </div>
                    </CardContent>
                  </Modal>
                </ModalProvider>
              )}
            </div>
          );
        },
      }),
    ],
    [t, handleRowClick, handleDeleteUser, canEditGroup, canViewUser],
  );

  if (loading && !group) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!group) return <Text>{t('common.error')}</Text>;

  return (
    <div>
        {showNewUserAddedAlert && (
          <div className="mb-1">
            <Alert
              icon="check_circle"
              onClose={() => setShowNewUserAddedAlert(false)}
              type="success"
              size="small"
            >
              {t('userGroups.newUserAddedNote')}
            </Alert>
          </div>
        )}
        <Button
          visualType="link"
          onClick={() => navigate('/user-groups')}
          iconLeft="arrow_back"
        >
          {t('common.back')}
        </Button>

        <div className="page-header">
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
              <Heading modifiers="h3">
                {t('userGroups.connectedOrganisations')}
              </Heading>
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
              <Heading modifiers="h3">
                {t('userGroups.groupPermissions')}
              </Heading>
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

        <Card className="mt-05">
          <Card.Content>
            <div className="card-main">
              <Heading modifiers="h3" color="secondary" className="mb-1">
                {t('userGroups.users')}
              </Heading>
              {canAddUser && (
                <Button onClick={() => navigate(`/user-groups/${id}/add-user`)}>
                  {t('userGroups.addUser')}
                </Button>
              )}
            </div>
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
                children: t('common.tableIsEmpty'),
              }}
            />
          </Card.Content>
        </Card>
    </div>
  );
}
