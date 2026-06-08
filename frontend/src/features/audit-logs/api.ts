import { post } from '../../shared/api/client.ts';
import type {
  PagedResponse,
  ListApiParams,
} from '../../hooks/usePaginatedList.ts';
import type { AuditLog } from '../audit-logs/types.ts';

export const listLogs = (params?: ListApiParams) =>
  post<PagedResponse<AuditLog>>(
    '/v1/logs/read/list',
    params as Record<string, unknown>,
  );

export const getLog = (id: string) =>
  post<AuditLog[]>('/v1/logs/read/get', { id });