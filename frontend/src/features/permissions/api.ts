import { post } from '../../shared/api/client';
import type { Permission } from './types';

export const listPermissions = () => post<Permission[]>('/v1/permissions/list', {});
