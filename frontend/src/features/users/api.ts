import { post } from '../../shared/api/client';
import type { PagedResponse, ListApiParams } from '../../hooks/usePaginatedList';
import type { User, UserListItem, UserGroupAssignment } from './types';

export const listUsers = (scope: 'admin' | 'local', params: ListApiParams) =>
  post<PagedResponse<UserListItem>>(`/v1/users/${scope}/list`, params as Record<string, unknown>);

export const getUser = (scope: 'admin' | 'local', id: string) =>
  post<User[]>(`/v1/users/${scope}/read/get`, { id });

export const insertUser = (scope: 'admin' | 'local', data: {
  firstName: string;
  lastName: string;
  personalCode: string;
  organisationId: string;
  structuralUnitName: string;
  jobTitleName: string;
  email: string;
  phone: string;
  accessStart: string;
  accessEnd: string;
}) => post<User[]>(`/v1/users/${scope}/edit/insert`, data);

export const updateUser = (scope: 'admin' | 'local', data: {
  id: string;
  firstName: string;
  lastName: string;
  personalCode: string;
  organisationId: string;
  structuralUnitName: string;
  jobTitleName: string;
  email: string;
  phone: string;
  accessStart: string;
  accessEnd: string;
  status: string;
}) => post<User[]>(`/v1/users/${scope}/edit/update`, data);

export const getUserGroups = (scope: 'admin' | 'local', userId: string) =>
  post<UserGroupAssignment[]>(`/v1/users/${scope}/read/get-groups`, { userId });

export const setUserGroups = (
  scope: 'admin' | 'local',
  userId: string,
  addedGroupIds: string[],
  removedGroupIds: string[],
) =>
  post<string>(`/v1/users/${scope}/edit/set-groups`, { userId, addedGroupIds, removedGroupIds });

export const checkPersonalCodeConflict = (
  scope: 'admin' | 'local',
  personalCode: string,
  id: string = '',
) =>
  post<{ id: string }[]>(`/v1/users/${scope}/read/check-personal-code-exists`, {
    personalCode,
    id,
  });
