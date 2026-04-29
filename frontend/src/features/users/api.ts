import { get, post } from '../../shared/api/client';
import type { User, UserListItem, UserGroupAssignment } from './types';

export const listUsers = (params: {
  page: string;
  pageSize: string;
  search?: string;
  organisationId?: string;
  sorting?: string;
}) => get<UserListItem[]>('/users/list', params as Record<string, string>);

export const getUser = (id: string) =>
  get<User[]>('/users/get', { id });

export const insertUser = (data: {
  firstName: string; lastName: string; personalCode: string;
  organisationId: string; email: string; phone: string;
  accessStart: string; accessEnd: string;
}) => post<User[]>('/users/insert', data);

export const updateUser = (data: {
  id: string; firstName: string; lastName: string; personalCode: string;
  organisationId: string; email: string; phone: string;
  accessStart: string; accessEnd: string;
}) => post<User[]>('/users/update', data);

export const updateUserStatus = (id: string, status: string) =>
  post<User[]>('/users/update-status', { id, status });

export const getUserGroups = (userId: string) =>
  get<UserGroupAssignment[]>('/users/get-groups', { userId });

export const setUserGroups = (userId: string, groupIds: string[]) =>
  post<string>('/users/set-groups', { userId, groupIds });

export const checkPersonalCodeConflict = (personalCode: string, id: string = '') =>
  get<{ id: string }[]>('/users/check-personal-code', { personalCode, id });
