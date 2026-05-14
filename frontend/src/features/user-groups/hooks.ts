import { useCallback, useEffect, useState } from 'react';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import type { UserGroup, UserGroupOrganisation, UserGroupPermission, UserGroupUser } from './types';
import {
  listUserGroups,
  getUserGroup,
  getUserGroupOrganisations,
  getUserGroupPermissions,
  getUserGroupUsers,
  updateUserGroupName,
  setUserGroupOrganisations,
  setUserGroupPermissions,
  deleteUserGroupUser,
  insertUserGroup, getUserGroupAvailableUsers, addUserToGroup,
} from './api';
import type { Organisation } from '../organisations/types';
import { listOrganisations } from '../organisations/api';
import type { Permission } from '../permissions/types';
import { listPermissions } from '../permissions/api';

// ---------------------------------------------------------------------------
// Data hook: user group list with search
// ---------------------------------------------------------------------------
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function useUserGroupList(user: { organisationname?: string; permissions?: string } | null, permissions: string[]) {
  const [data, setData] = useState<UserGroup[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<SortingState>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const sortStr = sorting.length
        ? `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`
        : 'name asc';
      const [result, allOrgs] = await Promise.all([
        listUserGroups({
          search,
          page: String(pagination.pageIndex + 1),
          pageSize: String(pagination.pageSize),
          sorting: sortStr,
        }),
        listOrganisations(),
      ]);

      const totalOrgs = allOrgs.length;

      // If search is active, fetch full organisation lists for each group
      const groupsWithOrgs = await Promise.all(
        result.map(async (group) => {
          if (search) {
            const groupOrgs = await getUserGroupOrganisations(group.id);
            const orgNames = groupOrgs.map((o) => o.name).join(', ');
            return { ...group, organisations: orgNames };
          }
          return group;
        })
      );

      const expandedData: UserGroup[] = [];
      groupsWithOrgs.forEach((group) => {
        let orgCount = 0;
        if (group.organisations) {
          const orgs = group.organisations.split(',').map((o) => o.trim()).filter((o) => o);
          orgCount = orgs.length;
          // If search is active, always expand all organisations individually
          if (search) {
            orgs.forEach((org, index) => {
              expandedData.push({
                ...group,
                organisations: org,
                isAdditionalGroupRow: index > 0,
                coversAllOrganisations: false
              });
            });
          } else if (orgCount === totalOrgs) {
            expandedData.push({ ...group, organisations: '', coversAllOrganisations: true });
          } else if (orgs.length > 0) {
            orgs.forEach((org, index) => {
              expandedData.push({
                ...group,
                organisations: org,
                isAdditionalGroupRow: index > 0,
                coversAllOrganisations: false
              });
            });
          } else {
            expandedData.push({ ...group, coversAllOrganisations: false });
          }
        } else {
          expandedData.push({ ...group, coversAllOrganisations: false });
        }
      });

      setData(expandedData);
      // Use backend total count if available
      if (result.length > 0 && result[0].total != null) {
        setTotalRows(result[0].total);
      } else {
        setTotalRows(result.length);
      }
    } catch (e) {
      console.error('Failed to load user groups', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, pagination, sorting, user, permissions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (value: string) => { 
    if (value.length >= 3 || value.length === 0) {
      setSearch(value); 
      setPagination((p) => ({ ...p, pageIndex: 0 })); 
    }
  };
  const clearSearch = () => { setSearchInput(''); setSearch(''); setPagination((p) => ({ ...p, pageIndex: 0 })); };

  return {
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
    refetch: fetchData,
  };
}

// ---------------------------------------------------------------------------
// Data + business logic hook: user group detail page
// ---------------------------------------------------------------------------
export function useUserGroupDetail(id: string | undefined) {
  // --- Data state ---
  const { t } = useTranslation();
  const [group, setGroup] = useState<UserGroup | null>(null);
  const [orgs, setOrgs] = useState<UserGroupOrganisation[]>([]);
  const [perms, setPerms] = useState<UserGroupPermission[]>([]);
  const [users, setUsers] = useState<UserGroupUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [nameError, setNameError] = useState('');
  const [organisationsError, setOrganisationsError] = useState(false);
  const [forbidden, setForbidden] = useState(false);


  // --- Edit states ---
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingOrgs, setEditingOrgs] = useState(false);
  const [allOrgs, setAllOrgs] = useState<Organisation[]>([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [editingPerms, setEditingPerms] = useState(false);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- Data fetching ---
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const sortStr = sorting.length
        ? `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`
        : '';
      const [g, o, p, u] = await Promise.all([
        getUserGroup(id),
        getUserGroupOrganisations(id),
        getUserGroupPermissions(id),
        getUserGroupUsers({
          userGroupId: id,
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
      if (e?.status === 403) {
        setForbidden(true);
      } else {
        console.error('Failed to load group', e);
      }
    } finally {
      setLoading(false);
    }
  }, [id, userSearch, pagination, sorting, forbidden]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Name edit ---
  const startEditName = () => {
    setEditName(group?.name ?? '');
    setEditingName(true);
    setNameError(false);
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

  // --- Orgs edit ---
  const startEditOrgs = async () => {
    const all = await listOrganisations();
    setAllOrgs(all);
    setSelectedOrgIds(new Set(orgs.map((o) => o.organisationId)));
    setEditingOrgs(true);
    setOrganisationsError(false);
  };

  const toggleOrg = (orgId: string) => {
    setOrganisationsError(false);
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId); else next.add(orgId);
      return next;
    });
  };

  const toggleAllOrgs = () => {
    setOrganisationsError(false);
    setSelectedOrgIds((prev) => {
      if (prev.size === allOrgs.length) {
        return new Set();
      }
      return new Set(allOrgs.map((org) => org.id));
    });
  };

  const saveOrgs = async () => {
    if (!id) return;
    if (selectedOrgIds.size == 0) {
      setOrganisationsError(true);
      return;
    }
    await setUserGroupOrganisations(id, Array.from(selectedOrgIds));
    setEditingOrgs(false);
    fetchData();
  };

  const cancelEditOrgs = () => setEditingOrgs(false);

  // --- Perms edit ---
  const startEditPerms = async () => {
    const all = await listPermissions();
    setAllPerms(all);
    setSelectedPermIds(new Set(perms.map((p) => p.permissionId)));
    setEditingPerms(true);
  };

  const togglePerm = (permId: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId); else next.add(permId);
      return next;
    });
  };

  const toggleAllPerms = () => {
    setSelectedPermIds((prev) => {
      if (prev.size === allPerms.length) {
        return new Set();
      }
      return new Set(allPerms.map((perm) => perm.id));
    });
  };

  const savePerms = async () => {
    if (!id) return;
    await setUserGroupPermissions(id, Array.from(selectedPermIds));
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
    setPagination((p) => ({...p, pageIndex: 0}));
  };

  // --- Delete ---
  const handleDeleteUser = async (userId: string) => {
    if (!id || !userId) return;
    try {
      const result = await deleteUserGroupUser(id, userId);
      console.log("Vastus: ", result);
      fetchData();
    } catch (e) {
      console.error('Failed to delete user from group', e);
    }
  };

  return {
    // data
    group,
    orgs,
    perms,
    users,
    loading,
    userSearchInput,
    setUserSearchInput,
    handleUserSearch,
    clearUserSearch,
    // table props
    isLoading: loading,
    totalRows,
    pagination,
    setPagination,
    sorting,
    setSorting,
    // name edit
    editingName,
    editName,
    setEditName,
    startEditName,
    saveName,
    cancelEditName,
    // orgs edit
    editingOrgs,
    allOrgs,
    selectedOrgIds,
    startEditOrgs,
    toggleOrg,
    toggleAllOrgs,
    saveOrgs,
    cancelEditOrgs,
    // perms edit
    editingPerms,
    allPerms,
    selectedPermIds,
    startEditPerms,
    togglePerm,
    toggleAllPerms,
    savePerms,
    cancelEditPerms,
    // delete
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDeleteUser,
    nameError,
    organisationsError,
    forbidden
  };
}

// ---------------------------------------------------------------------------
// Data hook: user group add user page
// ---------------------------------------------------------------------------
export function useUserGroupAddUser(id: string | undefined) {
  // --- Data state ---
  const [group, setGroup] = useState<UserGroup | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserGroupUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // --- Data fetching ---
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const sortStr = sorting.length
        ? `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`
        : '';
      const [g, orgs] = await Promise.all([
        getUserGroup(id),
        getUserGroupOrganisations(id),
      ]);
      const organisationIds = orgs.map(o => o.organisationId).join(',');
      const u = await getUserGroupAvailableUsers({
        userGroupId: id,
        organisationIds : organisationIds,
        search: userSearch,
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        sorting: sortStr,
      });
      setGroup(g[0] ?? null);
      setAvailableUsers(u);
      setTotalRows(u.length);
    } catch (e) {
      console.error('Failed to load group', e);
    } finally {
      setLoading(false);
    }
  }, [id, userSearch, pagination, sorting]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUserSearch = (value: string) => {
    if (value.length >= 3 || value.length === 0) {
      setUserSearch(value);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }
  };

  const clearUserSearch = () => {
    setUserSearchInput('');
    setUserSearch('');
    setPagination((p) => ({...p, pageIndex: 0}));
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const saveUsers = async () => {
    if (!id || selectedUserIds.size === 0) return;
    await addUserToGroup(id, Array.from(selectedUserIds));
    setSelectedUserIds(new Set());
  };

  return {
    // data
    group,
    availableUsers,
    loading,
    userSearchInput,
    setUserSearchInput,
    handleUserSearch,
    clearUserSearch,
    selectedUserIds,
    toggleUser,
    saveUsers,
    // table props
    isLoading: loading,
    totalRows,
    pagination,
    setPagination,
    sorting,
    setSorting,
  };
}

// ---------------------------------------------------------------------------
// Form hook: create user group
// ---------------------------------------------------------------------------
export function useUserGroupForm(onSaved: (id: string) => void) {
  const { t } = useTranslation();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [name, setName] = useState('');
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [nameError, setNameError] = useState('');
  const [organisationsError, setOrganisationsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listOrganisations(), listPermissions()])
      .then(([orgs, perms]) => {
        setOrganisations(orgs);
        setPermissions(perms);
      })
      .catch(console.error);
  }, []);

  const toggleOrg = (id: string) => {
    setOrganisationsError(false);
    setSelectedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const togglePerm = (id: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllOrgs = () => {
    setOrganisationsError(false);
    setSelectedOrgs((prev) => {
      if (prev.size === organisations.length) {
        return new Set();
      }
      return new Set(organisations.map((org) => org.id));
    });
  };

  const toggleAllPerms = () => {
    setSelectedPerms((prev) => {
      if (prev.size === permissions.length) {
        return new Set();
      }
      return new Set(permissions.map((perm) => perm.id));
    });
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setNameError('');
  };

  const handleSave = async () => {
    let hasError = false;
    if (!name.trim()) {
      setNameError(t('userGroups.validation.nameRequired'));
      hasError = true;
    }
    if (selectedOrgs.size == 0) {
      setOrganisationsError(true);
      hasError = true;
    }
    if (hasError) {
      return;
    }
    setSaving(true);
    try {
      const result = await insertUserGroup({
        name: name.trim(),
        organisationIds: Array.from(selectedOrgs),
        permissionIds: Array.from(selectedPerms),
      });
      onSaved(result[0].id);
    } catch (e) {
      console.error('Failed to create group', e);
    } finally {
      setSaving(false);
    }
  };

  return {
    organisations,
    permissions,
    name,
    handleNameChange,
    nameError,
    organisationsError,
    selectedOrgs,
    toggleOrg,
    toggleAllOrgs,
    selectedPerms,
    togglePerm,
    toggleAllPerms,
    saving,
    handleSave,
  };
}
