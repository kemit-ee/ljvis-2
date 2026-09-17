import { get } from '../../shared/api/client';
import type { ListParams, PagedResponse } from '../../hooks/usePaginatedList';
import type { XroadLogEntry, XroadLogFilters } from './types';

/**
 * Haldus > eToimiku X-tee logid — server-paginated. Vaikimisi sortimine
 * created_at DESC (määratud useXroadLogList's), backend eraldi sort-params'e
 * ei toeta (vt list_integration_log.sql — ORDER BY created_at DESC fikseeritud).
 */
export function fetchXroadLogList(
  params: ListParams,
  filters: XroadLogFilters = {},
): Promise<PagedResponse<XroadLogEntry>> {
  return get<PagedResponse<XroadLogEntry>>('/v1/xroad/etoimik/logs/list', {
    page: params.page,
    pageSize: params.pageSize,
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    ...(filters.includeFound !== undefined
      ? { includeFound: filters.includeFound }
      : {}),
    ...(filters.includeNotFound !== undefined
      ? { includeNotFound: filters.includeNotFound }
      : {}),
    ...(filters.includeError !== undefined
      ? { includeError: filters.includeError }
      : {}),
  });
}
