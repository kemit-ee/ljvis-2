import { get, post, put, del } from '../../shared/api/client';
import type {
  PagedResponse,
  ListApiParams,
} from '../../hooks/usePaginatedList';
import type {
  UserGroup,
  UserGroupOrganisation,
  UserGroupPermission,
  UserGroupUser,
} from './types';

export const listUserGroups = (
  scope: 'admin' | 'local',
  params?: ListApiParams,
) =>
  get<PagedResponse<UserGroup>>(
    `/v1/user-groups/${scope}`,
    params as Record<string, string>,
  );

export const getUserGroup = (
  scope: 'admin' | 'local',
  id: string,
  logAudit: boolean,
) =>
  get<UserGroup[]>(`/v1/user-groups/${scope}/${id}`, {
    logAudit: String(logAudit),
  });

export const getUserGroupOrganisations = (
  scope: 'admin' | 'local',
  id: string,
) =>
  get<UserGroupOrganisation[]>(`/v1/user-groups/${scope}/${id}/organisations`);

export const getUserGroupPermissions = (scope: 'admin' | 'local', id: string) =>
  get<UserGroupPermission[]>(`/v1/user-groups/${scope}/${id}/permissions`);

export const getUserGroupUsers = (
  scope: 'admin' | 'local',
  params?: {
    userGroupId: number;
    page?: string;
    pageSize?: string;
    sorting?: string;
    search?: string;
  },
) =>
  get<UserGroupUser[]>(
    `/v1/user-groups/${scope}/${params?.userGroupId}/users`,
    {
      ...(params?.page !== undefined && { page: params.page }),
      ...(params?.pageSize !== undefined && { pageSize: params.pageSize }),
      ...(params?.sorting !== undefined && { sorting: params.sorting }),
      ...(params?.search !== undefined && { search: params.search }),
    },
  );

export const getUserGroupAvailableUsers = (params?: {
  userGroupId: string;
  organisationIds: string;
  page?: string;
  pageSize?: string;
  sorting?: string;
  search?: string;
}) =>
  post<UserGroupUser[]>(
    '/v1/user-groups/available-users',
    params as Record<string, unknown>,
  );

export const insertUserGroup = (data: {
  name: string;
  organisationIds?: number[];
  permissionIds?: number[];
}) => post<UserGroup[]>('/v1/user-groups', data);

export const updateUserGroupName = (id: string, name: string) =>
  put<UserGroup[]>(`/v1/user-groups/${id}`, { id, name });

export const setUserGroupOrganisations = (
  id: string,
  addedOrganisationIds: number[],
  removedOrganisationIds: number[],
) =>
  put<string>(`/v1/user-groups/${id}/organisations`, {
    id,
    addedOrganisationIds,
    removedOrganisationIds,
  });

export const setUserGroupPermissions = (
  id: string,
  addedPermissionIds: number[],
  removedPermissionIds: number[],
) =>
  put<string>(`/v1/user-groups/${id}/permissions`, {
    id,
    addedPermissionIds,
    removedPermissionIds,
  });

export const deleteUserGroupUser = (id: string, userId: string) =>
  del<{ id: string }[]>(`/v1/user-groups/${id}/users/${userId}`);

export const addUserToGroup = (id: string, userIds: string[]) =>
  put<string>(`/v1/user-groups/${id}/users`, { id, userIds });
