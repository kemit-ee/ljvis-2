import { post } from '../../shared/api/client';
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
  post<PagedResponse<UserGroup>>(
    `/v1/user-groups/${scope}/list`,
    params as Record<string, unknown>,
  );

export const getUserGroup = (scope: 'admin' | 'local', id: string) =>
  post<UserGroup[]>(`/v1/user-groups/${scope}/read/get`, { id });

export const getUserGroupOrganisations = (
  scope: 'admin' | 'local',
  id: string,
) =>
  post<UserGroupOrganisation[]>(
    `/v1/user-groups/${scope}/read/get-organisations`,
    { id },
  );

export const getUserGroupPermissions = (scope: 'admin' | 'local', id: string) =>
  post<UserGroupPermission[]>(`/v1/user-groups/${scope}/read/get-permissions`, {
    id,
  });

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
  post<UserGroupUser[]>(
    `/v1/user-groups/${scope}/read/get-users`,
    params as Record<string, unknown>,
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
    '/v1/user-groups/search/get-available-users',
    params as Record<string, unknown>,
  );

export const insertUserGroup = (data: {
  name: string;
  organisationIds?: string[];
  permissionIds?: string[];
}) => post<UserGroup[]>('/v1/user-groups/write/insert', data);

export const updateUserGroupName = (id: string, name: string) =>
  post<UserGroup[]>('/v1/user-groups/write/update-name', { id, name });

export const setUserGroupOrganisations = (
  id: string,
  addedOrganisationIds: string[],
  removedOrganisationIds: string[],
) =>
  post<string>('/v1/user-groups/write/set-organisations', {
    id,
    addedOrganisationIds,
    removedOrganisationIds,
  });

export const setUserGroupPermissions = (
  id: string,
  addedPermissionIds: string[],
  removedPermissionIds: string[],
) =>
  post<string>('/v1/user-groups/write/set-permissions', {
    id,
    addedPermissionIds,
    removedPermissionIds,
  });

export const deleteUserGroupUser = (id: string, userId: string) =>
  post<{ id: string }[]>('/v1/user-groups/write/delete-user', { id, userId });

export const addUserToGroup = (id: string, userIds: string[]) =>
  post<string>('/v1/user-groups/write/add-users', { id, userIds });
