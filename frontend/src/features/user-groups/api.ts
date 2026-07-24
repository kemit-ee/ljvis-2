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
) => {
  const { search, ...rest } = params ?? {};
  return get<PagedResponse<UserGroup>>(`/v1/user-groups/${scope}/search`, {
    ...rest,
    ...(search !== undefined && { q: search }),
  } as Record<string, string>);
};

export const getUserGroup = (scope: 'admin' | 'local', id: string) =>
  get<UserGroup[]>(`/v1/user-groups/${scope}`, { q: id });

export const getUserGroupOrganisations = (
  scope: 'admin' | 'local',
  id: string,
) =>
  get<UserGroupOrganisation[]>(`/v1/user-groups/${scope}/organisations`, {
    q: id,
  });

export const getUserGroupPermissions = (scope: 'admin' | 'local', id: string) =>
  get<UserGroupPermission[]>(`/v1/user-groups/${scope}/permissions`, { q: id });

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
  get<UserGroupUser[]>(`/v1/user-groups/${scope}/users`, {
    ...(params?.userGroupId !== undefined && { q: String(params.userGroupId) }),
    ...(params?.page !== undefined && { page: params.page }),
    ...(params?.pageSize !== undefined && { pageSize: params.pageSize }),
    ...(params?.sorting !== undefined && { sorting: params.sorting }),
    ...(params?.search !== undefined && { search: params.search }),
  });

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
  put<UserGroup[]>('/v1/user-groups', { id, name });

export const setUserGroupOrganisations = (
  id: string,
  addedOrganisationIds: number[],
  removedOrganisationIds: number[],
) =>
  put<string>('/v1/user-groups/organisations', {
    id,
    addedOrganisationIds,
    removedOrganisationIds,
  });

export const setUserGroupPermissions = (
  id: string,
  addedPermissionIds: number[],
  removedPermissionIds: number[],
) =>
  put<string>('/v1/user-groups/permissions', {
    id,
    addedPermissionIds,
    removedPermissionIds,
  });

export const deleteUserGroupUser = (id: string, userId: string) =>
  del<{ id: string }[]>('/v1/user-groups/user', { q: id, userId });

export const addUserToGroup = (id: string, userIds: string[]) =>
  put<string>('/v1/user-groups/users', { id, userIds });
