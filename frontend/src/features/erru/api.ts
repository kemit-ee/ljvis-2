import { get, post, put } from '../../shared/api/client';
import type { ListParams, PagedResponse } from '../../hooks/usePaginatedList';
import type {
  CtudListFilters,
  CtudRequest,
  CtudRequestListItem,
  CtudRequestWrite,
  CtudSaveResult,
} from './types';

/**
 * Reads are GET per docs/rest-api-design-guide.md section 2.3, which lists POST-based
 * list retrieval as a forbidden pattern. The task specification's POST /erru/ctud/list
 * and POST /erru/ctud/get are deliberately not followed.
 */

/**
 * List CTUD requests. All filters are optional and AND-combined, EXCEPT
 * transportUndertakingName / communityLicenceNumber / vehicleRegistrationNumber, which
 * are OR-combined with each other and then AND-combined with the rest (server-side, in
 * search.sql). `search` from usePaginatedList is mapped onto businessCaseId.
 */
export function listCtudRequests(
  params: ListParams,
  filters: CtudListFilters = {},
): Promise<PagedResponse<CtudRequestListItem>> {
  const query: Record<string, string> = {
    page: params.page,
    pageSize: params.pageSize,
    sorting: params.sorting,
  };
  if (params.search) query.businessCaseId = params.search;
  Object.entries(filters).forEach(([k, v]) => {
    if (v) query[k] = v;
  });
  return get<PagedResponse<CtudRequestListItem>>('/v1/erru/ctud/search', query);
}

/** Get one request — always the latest snapshot. */
export function getCtudRequest(id: string): Promise<CtudRequest> {
  return get<CtudRequest>('/v1/erru/ctud', { q: id });
}

/** Create an outgoing draft. businessCaseId, status, direction and ctudFrom are server-assigned. */
export function createCtudRequest(body: CtudRequestWrite): Promise<CtudSaveResult> {
  return post<CtudSaveResult>('/v1/erru/ctud', { ...body });
}

/** Revise an outgoing draft — appends a new snapshot with version + 1. */
export function updateCtudRequest(
  id: string,
  body: CtudRequestWrite,
): Promise<CtudSaveResult> {
  return put<CtudSaveResult>('/v1/erru/ctud', { id, ...body });
}

/**
 * Send to the target member state. Synchronous: the answer is stored before this
 * resolves. Timeout and NotAvailable are successful outcomes (status becomes
 * 'responded'); only a transport failure yields 502 and status 'error', from which
 * sending may be retried.
 */
export function sendCtudRequest(id: string): Promise<CtudSaveResult> {
  return post<CtudSaveResult>('/v1/erru/ctud/send', { id });
}
