import { useCallback, useEffect, useState } from 'react';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { UserGroup, UserGroupUser } from '../../types';
import {
  getUserGroup,
  getUserGroupOrganisations,
  getUserGroupAvailableUsers,
  addUserToGroup,
} from '../../api';
import { toSnakeCase } from '../../../../hooks/stringUtils';
import { useAuth } from '../../../auth/useAuth';

export function useUserGroupAddUser(id: string | undefined) {
  const { hasPermission } = useAuth();
  const scope = hasPermission('user_group.read.admin') ? 'admin' : 'local';
  const [group, setGroup] = useState<UserGroup | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserGroupUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const sortStr = sorting.length
        ? `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`
        : '';
      const [g, orgs] = await Promise.all([
        getUserGroup(scope, id),
        getUserGroupOrganisations(scope, id),
      ]);
      const organisationIds = orgs.map((o) => o.organisationId).join(',');
      const u = await getUserGroupAvailableUsers({
        userGroupId: id,
        organisationIds,
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
  }, [id, scope, userSearch, pagination, sorting]);

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
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) newSet.delete(userId);
      else newSet.add(userId);
      return newSet;
    });
  };

  const saveUsers = async () => {
    if (!id || selectedUserIds.size === 0) return;
    await addUserToGroup(id, Array.from(selectedUserIds));
    setSelectedUserIds(new Set());
    fetchData();
  };

  return {
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
    isLoading: loading,
    totalRows,
    pagination,
    setPagination,
    sorting,
    setSorting,
  };
}
