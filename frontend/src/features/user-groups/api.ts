import { get, post } from '../../shared/api/client';
import type { UserGroup, UserGroupOrganisation, UserGroupPermission, UserGroupUser } from './types';

export const listUserGroups = (params?: { search?: string; organisationSearch?: string }) =>
  get<UserGroup[]>('/user-groups/list', params as Record<string, string>);

export const getUserGroup = (id: string) =>
  get<UserGroup[]>('/user-groups/get', { id });

export const getUserGroupOrganisations = (id: string) =>
  get<UserGroupOrganisation[]>('/user-groups/get-organisations', { id });

export const getUserGroupPermissions = (id: string) =>
  get<UserGroupPermission[]>('/user-groups/get-permissions', { id });

export const getUserGroupUsers = (id: string, search?: string) =>
  get<UserGroupUser[]>('/user-groups/get-users', { id, search: search ?? '' });

export const insertUserGroup = (data: { name: string; organisationIds?: string[]; permissionIds?: string[] }) =>
  post<UserGroup[]>('/user-groups/insert', data);

export const updateUserGroupName = (id: string, name: string) =>
  post<UserGroup[]>('/user-groups/update-name', { id, name });

export const setUserGroupOrganisations = (id: string, organisationIds: string[]) =>
  post<string>('/user-groups/set-organisations', { id, organisationIds });

export const setUserGroupPermissions = (id: string, permissionIds: string[]) =>
  post<string>('/user-groups/set-permissions', { id, permissionIds });

export const deleteUserGroup = (id: string) =>
  post<{ id: string }[]>('/user-groups/delete', { id });
