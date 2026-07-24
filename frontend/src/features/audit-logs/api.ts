import { get } from '../../shared/api/client.ts';
import type {
  ListApiParams,
  PagedResponse,
} from '../../hooks/usePaginatedList.ts';
import type { AuditLog } from '../audit-logs/types.ts';

export const listLogs = (params?: ListApiParams) =>
  get<PagedResponse<AuditLog>>('/v1/logs', params as Record<string, string>);

export const exportLogs = (params?: ListApiParams) =>
  get<PagedResponse<AuditLog>>(
    '/v1/logs/export',
    params as Record<string, string>,
  );

export const getLog = (id: string) =>
  get<AuditLog[]>('/v1/logs/log', { q: id });
