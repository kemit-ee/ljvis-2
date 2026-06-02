import { get, post } from '../../shared/api/client';
import type { PagedResponse, ListApiParams } from '../../hooks/usePaginatedList';
import type { User, UserListItem, UserGroupAssignment } from './types';

export const listUsers = (params: ListApiParams) =>
  get<PagedResponse<UserListItem>>('/users/list', params as Record<string, string>);

export const getUser = (id: string) => get<User[]>('/users/get', { id });

export const insertUser = (data: {
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
}) => post<User[]>('/users/insert', data);

export const updateUser = (data: {
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
}) => post<User[]>('/users/update', data);

export const getUserGroups = (userId: string) =>
  get<UserGroupAssignment[]>('/users/get-groups', { userId });

export const setUserGroups = (
  userId: string,
  addedGroupIds: string[],
  removedGroupIds: string[],
) =>
  post<string>('/users/set-groups', { userId, addedGroupIds, removedGroupIds });

export const checkPersonalCodeConflict = (
  personalCode: string,
  id: string = '',
) =>
  get<{ id: string }[]>('/users/check-personal-code-exists', {
    personalCode,
    id,
  });
