import { get, post } from '../../shared/api/client';
import type {
  UserGroup,
  UserGroupOrganisation,
  UserGroupPermission,
  UserGroupUser,
} from './types';

export const listUserGroups = (params?: {
  search?: string;
  page?: string;
  pageSize?: string;
  sorting?: string;
}) => get<UserGroup[]>('/user-groups/list', params as Record<string, string>);

export const getUserGroup = (id: string) =>
  get<UserGroup[]>('/user-groups/get', { id });

export const getUserGroupOrganisations = (id: string) =>
  get<UserGroupOrganisation[]>('/user-groups/get-organisations', { id });

export const getUserGroupPermissions = (id: string) =>
  get<UserGroupPermission[]>('/user-groups/get-permissions', { id });

export const getUserGroupUsers = (params?: {
  userGroupId: string;
  page?: string;
  pageSize?: string;
  sorting?: string;
  search?: string;
}) =>
  get<UserGroupUser[]>(
    '/user-groups/get-users',
    params as Record<string, string>,
  );

export const getUserGroupAvailableUsers = (params?: {
  userGroupId: string;
  organisationIds: string;
  page?: string;
  pageSize?: string;
  sorting?: string;
  search?: string;
}) =>
  get<UserGroupUser[]>(
    '/user-groups/get-available-users',
    params as Record<string, string>,
  );

export const insertUserGroup = (data: {
  name: string;
  organisationIds?: string[];
  permissionIds?: string[];
}) => post<UserGroup[]>('/user-groups/insert', data);

export const updateUserGroupName = (id: string, name: string) =>
  post<UserGroup[]>('/user-groups/update-name', { id, name });

export const setUserGroupOrganisations = (
  id: string,
  addedOrganisationIds: string[],
  removedOrganisationIds: string[],
) =>
  post<string>('/user-groups/set-organisations', {
    id,
    addedOrganisationIds,
    removedOrganisationIds,
  });

export const setUserGroupPermissions = (
  id: string,
  addedPermissionIds: string[],
  removedPermissionIds: string[],
) =>
  post<string>('/user-groups/set-permissions', {
    id,
    addedPermissionIds,
    removedPermissionIds,
  });

export const deleteUserGroupUser = (id: string, userId: string) =>
  post<{ id: string }[]>('/user-groups/delete-user', { id, userId });

export const addUserToGroup = (id: string, userIds: string[]) =>
  post<string>('/user-groups/add-users', { id, userIds });
