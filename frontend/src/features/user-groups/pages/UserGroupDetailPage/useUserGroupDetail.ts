import { useCallback, useEffect, useState, useRef } from 'react';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../auth/useAuth';
import type {
  UserGroup,
  UserGroupOrganisation,
  UserGroupPermission,
  UserGroupUser,
} from '../../types';
import {
  getUserGroup,
  getUserGroupOrganisations,
  getUserGroupPermissions,
  getUserGroupUsers,
  updateUserGroupName,
  setUserGroupOrganisations,
  setUserGroupPermissions,
  deleteUserGroupUser,
} from '../../api';
import type { Organisation } from '../../../organisations/types';
import { listOrganisations } from '../../../organisations/api';
import type { Permission } from '../../../permissions/types';
import { listPermissions } from '../../../permissions/api';
import { toSnakeCase } from '../../../../hooks/stringUtils';

export function useUserGroupDetail(id: string | undefined) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const scope = hasPermission('user_group.read.admin') ? 'admin' : 'local';
  const [group, setGroup] = useState<UserGroup | null>(null);
  const [orgs, setOrgs] = useState<UserGroupOrganisation[]>([]);
  const [perms, setPerms] = useState<UserGroupPermission[]>([]);
  const [users, setUsers] = useState<UserGroupUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [nameError, setNameError] = useState('');
  const [organisationsError, setOrganisationsError] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingOrgs, setEditingOrgs] = useState(false);
  const [allOrgs, setAllOrgs] = useState<Organisation[]>([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [originalOrgIds, setOriginalOrgIds] = useState<Set<string>>(new Set());
  const [editingPerms, setEditingPerms] = useState(false);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [originalPermIds, setOriginalPermIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const sortStr = sorting.length
        ? `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`
        : '';
      const [g, o, p, u] = await Promise.all([
        getUserGroup(scope, id),
        getUserGroupOrganisations(scope, id),
        getUserGroupPermissions(scope, id),
        getUserGroupUsers(scope, {
          userGroupId: Number(id),
          search: userSearch,
          page: String(pagination.pageIndex + 1),
          pageSize: String(pagination.pageSize),
          sorting: sortStr,
        }),
      ]);
      setGroup(g[0] ?? null);
      setOrgs(o);
      setPerms(p);
      setUsers(u);
      setTotalRows(u.length);
    } catch (e) {
      console.error('Failed to load group', e);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [id, scope, userSearch, pagination, sorting]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startEditName = () => {
    setEditName(group?.name ?? '');
    setEditingName(true);
    setNameError('');
  };

  const saveName = async () => {
    if (!id || !editName.trim()) {
      setNameError(t('userGroups.validation.nameRequired'));
      return;
    }
    await updateUserGroupName(id, editName.trim());
    setEditingName(false);
    fetchData();
  };

  const cancelEditName = () => setEditingName(false);

  const startEditOrgs = async () => {
    const all = await listOrganisations();
    setAllOrgs(all.map((o) => ({ ...o, id: String(o.id) })));
    const currentIds = new Set(orgs.map((o) => String(o.organisationId)));
    setSelectedOrgIds(currentIds);
    setOriginalOrgIds(currentIds);
    setEditingOrgs(true);
    setOrganisationsError(false);
  };

  const toggleOrg = (orgId: string) => {
    setOrganisationsError(false);
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId);
      else next.add(orgId);
      return next;
    });
  };

  const toggleAllOrgs = () => {
    setOrganisationsError(false);
    setSelectedOrgIds((prev) => {
      if (prev.size === allOrgs.length) return new Set();
      return new Set(allOrgs.map((org) => org.id));
    });
  };

  const saveOrgs = async () => {
    if (!id) return;
    if (selectedOrgIds.size == 0) {
      setOrganisationsError(true);
      return;
    }
    const removedOrgIds = Array.from(originalOrgIds).filter(
      (oid) => !selectedOrgIds.has(oid),
    );
    const addedOrgIds = Array.from(selectedOrgIds).filter(
      (oid) => !originalOrgIds.has(oid),
    );
    await setUserGroupOrganisations(id, addedOrgIds, removedOrgIds);
    setEditingOrgs(false);
    fetchData();
  };

  const cancelEditOrgs = () => setEditingOrgs(false);

  const startEditPerms = async () => {
    const all = await listPermissions();
    setAllPerms(all.map((p) => ({ ...p, id: String(p.id) })));
    const currentIds = new Set(perms.map((p) => String(p.permissionId)));
    setSelectedPermIds(currentIds);
    setOriginalPermIds(currentIds);
    setEditingPerms(true);
  };

  const togglePerm = (permId: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleAllPerms = () => {
    setSelectedPermIds((prev) => {
      if (prev.size === allPerms.length) return new Set();
      return new Set(allPerms.map((perm) => perm.id));
    });
  };

  const savePerms = async () => {
    if (!id) return;
    const removedPermissionIds = Array.from(originalPermIds).filter(
      (pid) => !selectedPermIds.has(pid),
    );
    const addedPermissionIds = Array.from(selectedPermIds).filter(
      (pid) => !originalPermIds.has(pid),
    );
    await setUserGroupPermissions(id, addedPermissionIds, removedPermissionIds);
    setEditingPerms(false);
    fetchData();
  };

  const cancelEditPerms = () => setEditingPerms(false);

  const handleUserSearch = (value: string) => {
    if (value.length >= 3 || value.length === 0) {
      setUserSearch(value);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }
  };

  const clearUserSearch = () => {
    setUserSearchInput('');
    setUserSearch('');
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const handleDeleteUser = async (userId: string) => {
    if (!id || !userId) return;
    try {
      const result = await deleteUserGroupUser(id, userId);
      console.log('Vastus: ', result);
      fetchData();
    } catch (e) {
      console.error('Failed to delete user from group', e);
    }
  };

  return {
    group,
    orgs,
    perms,
    users,
    loading,
    userSearchInput,
    setUserSearchInput,
    handleUserSearch,
    clearUserSearch,
    isLoading: loading,
    totalRows,
    pagination,
    setPagination,
    sorting,
    setSorting,
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
    saveOrgs,
    cancelEditOrgs,
    editingPerms,
    allPerms,
    selectedPermIds,
    startEditPerms,
    togglePerm,
    toggleAllPerms,
    savePerms,
    cancelEditPerms,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDeleteUser,
    nameError,
    organisationsError,
  };
}
