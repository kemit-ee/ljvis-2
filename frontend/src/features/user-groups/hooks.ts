import { useCallback, useEffect, useState } from 'react';
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
export function useUserGroupList() {
  const [data, setData] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [orgSearchInput, setOrgSearchInput] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listUserGroups({ search, organisationSearch: orgSearch });
      setData(result);
    } catch (e) {
      console.error('Failed to load user groups', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, orgSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (value: string) => setSearch(value);
  const clearSearch = () => { setSearchInput(''); setSearch(''); };
  const handleOrgSearch = (value: string) => setOrgSearch(value);
  const clearOrgSearch = () => { setOrgSearchInput(''); setOrgSearch(''); };

  return {
    data,
    isLoading,
    searchInput,
    setSearchInput,
    handleSearch,
    clearSearch,
    orgSearchInput,
    setOrgSearchInput,
    handleOrgSearch,
    clearOrgSearch,
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
export function useUserGroupForm(onSaved: () => void) {
  const { t } = useTranslation();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [name, setName] = useState('');
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [nameError, setNameError] = useState('');
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

  const handleNameChange = (value: string) => {
    setName(value);
    setNameError('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(t('userGroups.validation.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      await insertUserGroup({
        name: name.trim(),
        organisationIds: Array.from(selectedOrgs),
        permissionIds: Array.from(selectedPerms),
      });
      onSaved();
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
    selectedOrgs,
    toggleOrg,
    selectedPerms,
    togglePerm,
    saving,
    handleSave,
  };
}
