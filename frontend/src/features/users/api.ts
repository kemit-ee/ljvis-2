import { get, post, put } from '../../shared/api/client';
import type {
  PagedResponse,
  ListApiParams,
} from '../../hooks/usePaginatedList';
import type { User, UserListItem, UserGroupAssignment } from './types';

export const listUsers = (scope: 'admin' | 'local', params: ListApiParams) => {
  const { search, ...rest } = params;
  return get<PagedResponse<UserListItem>>(`/v1/users/${scope}/search`, {
    ...rest,
    ...(search !== undefined && { q: search }),
  } as Record<string, string>);
};

export const getUser = (scope: 'admin' | 'local', id: string) =>
  get<User[]>(`/v1/users/${scope}`, { q: id });

export const insertUser = (
  scope: 'admin' | 'local',
  data: {
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
  },
) => post<User[]>(`/v1/users/${scope}`, data);

export const updateUser = (
  scope: 'admin' | 'local',
  data: {
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
  },
) => put<User[]>(`/v1/users/${scope}`, data);

export const getUserGroups = (scope: 'admin' | 'local', userId: string) =>
  get<UserGroupAssignment[]>(`/v1/users/${scope}/groups`, { q: userId });

export const setUserGroups = (
  scope: 'admin' | 'local',
  userId: string,
  addedGroupIds: string[],
  removedGroupIds: string[],
) =>
  put<string>(`/v1/users/${scope}/groups`, {
    userId,
    addedGroupIds,
    removedGroupIds,
  });

export const checkPersonalCodeConflict = (
  scope: 'admin' | 'local',
  personalCode: string,
  id: string = '',
) =>
  post<{ id: string }[]>(`/v1/users/${scope}/check-personal-code`, {
    personalCode,
    id,
  });
