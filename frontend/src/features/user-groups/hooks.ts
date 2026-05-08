import { useCallback, useEffect, useState } from 'react';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
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
  deleteUserGroup,
  insertUserGroup,
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

      // Check if user is admin or local admin
      const isLocalAdmin = permissions.includes('perm_user_group_list_local') && !permissions.includes('perm_user_group_edit_admin');

      // If search is active, fetch full organisation lists for each group
      const groupsWithFullOrgs = await Promise.all(
        result.map(async (group) => {
          if (search) {
            const groupOrgs = await getUserGroupOrganisations(group.id);
            const orgNames = groupOrgs.map((o) => o.name).join(', ');
            return { ...group, organisations: orgNames };
          }
          return group;
        })
      );

      // Filter groups for local admin: only show user's organisation groups and covers_all_organisations=true groups
      let filteredGroups = groupsWithFullOrgs;
      if (isLocalAdmin && user?.organisationname) {
        filteredGroups = groupsWithFullOrgs.filter((group) => {
          const orgs = group.organisations ? group.organisations.split(',').map((o) => o.trim()).filter((o) => o) : [];
          // Show groups with no organisations, user's organisation, or covers all organisations
          const hasNoOrgs = orgs.length === 0;
          const hasUserOrg = orgs.includes(user.organisationname);
          const coversAll = orgs.length === totalOrgs;
          return hasNoOrgs || hasUserOrg || coversAll;
        });
      }

      const expandedData: UserGroup[] = [];
      filteredGroups.forEach((group) => {
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
      // For local admin use filtered count for totalRows, but not for admin
      if (isLocalAdmin && user?.organisationname) {
        setTotalRows(filteredGroups.length);
      } else if (result.length > 0 && result[0].total != null) {
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
  const navigate = useNavigate();

  // --- Data state ---
  const [group, setGroup] = useState<UserGroup | null>(null);
  const [orgs, setOrgs] = useState<UserGroupOrganisation[]>([]);
  const [perms, setPerms] = useState<UserGroupPermission[]>([]);
  const [users, setUsers] = useState<UserGroupUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

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
      const [g, o, p, u] = await Promise.all([
        getUserGroup(id),
        getUserGroupOrganisations(id),
        getUserGroupPermissions(id),
        getUserGroupUsers(id, userSearch),
      ]);
      setGroup(g[0] ?? null);
      setOrgs(o);
      setPerms(p);
      setUsers(u);
    } catch (e) {
      console.error('Failed to load group', e);
    } finally {
      setLoading(false);
    }
  }, [id, userSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Name edit ---
  const startEditName = () => {
    setEditName(group?.name ?? '');
    setEditingName(true);
  };

  const saveName = async () => {
    if (!id || !editName.trim()) return;
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
  };

  const toggleOrg = (orgId: string) => {
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId); else next.add(orgId);
      return next;
    });
  };

  const saveOrgs = async () => {
    if (!id) return;
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

  const savePerms = async () => {
    if (!id) return;
    await setUserGroupPermissions(id, Array.from(selectedPermIds));
    setEditingPerms(false);
    fetchData();
  };

  const cancelEditPerms = () => setEditingPerms(false);

  // --- Delete ---
  const handleDelete = async () => {
    if (!id) return;
    await deleteUserGroup(id);
    navigate('/user-groups');
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
    handleUserSearch: (value: string) => setUserSearch(value),
    clearUserSearch: () => { setUserSearchInput(''); setUserSearch(''); },
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
    saveOrgs,
    cancelEditOrgs,
    // perms edit
    editingPerms,
    allPerms,
    selectedPermIds,
    startEditPerms,
    togglePerm,
    savePerms,
    cancelEditPerms,
    // delete
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDelete,
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
