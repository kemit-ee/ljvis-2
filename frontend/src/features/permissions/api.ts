import { get } from '../../shared/api/client';
import type { Permission } from './types';

export const listPermissions = () => get<Permission[]>('/permissions/list');
