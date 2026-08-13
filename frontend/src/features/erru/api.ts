import { get, post, put } from '../../shared/api/client';
import type { ListParams, PagedResponse } from '../../hooks/usePaginatedList';
import type {
  CgrListFilters,
  CgrRequest,
  CgrRequestListItem,
  CgrRequestWrite,
  CgrSaveResult,
  CtudListFilters,
  CtudRequest,
  CtudRequestListItem,
  CtudRequestWrite,
  CtudSaveResult,
  RsiMessage,
  RsiMessageWrite,
  RsiSaveResult,
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

/**
 * CGR (Check Good Repute / Mainepäring) — vorm stage only (LJVIS2-138). Send (-139) and
 * list (-140) land in later stages.
 *
 * URLs are nested one level deeper than CTUD's bare '/v1/erru/ctud' — CGR needs its own
 * guard-isolated directory, since cgr.create and ctud.create can't share a Ruuter guard
 * on the same bare 'erru/' directory. See DSL/Ruuter/ljvis/POST/v1/erru/cgr/draft/.guard.
 */

/** Get one CGR request — always the latest snapshot. */
export function getCgrRequest(id: string): Promise<CgrRequest> {
  return get<CgrRequest>('/v1/erru/cgr/get', { q: id });
}

/**
 * Create an outgoing CGR draft. businessCaseId, status, direction and cgrFrom are
 * server-assigned. "Kopeeri päring" (LJVIS2-140) is not a separate endpoint — the caller
 * reads the source request via getCgrRequest and passes its tm-/certificate-prefixed
 * fields here.
 */
export function createCgrRequest(body: CgrRequestWrite): Promise<CgrSaveResult> {
  return post<CgrSaveResult>('/v1/erru/cgr/draft/create', { ...body });
}

/** Revise an outgoing CGR draft — appends a new snapshot with version + 1. */
export function updateCgrRequest(
  id: string,
  body: CgrRequestWrite,
): Promise<CgrSaveResult> {
  return put<CgrSaveResult>('/v1/erru/cgr/draft/revise', { id, ...body });
}

/**
 * List CGR requests (LJVIS2-140) — OUTGOING ONLY per the task specification; direction
 * is not a filter here (contrast with listCtudRequests). All filters are optional and
 * AND-combined, including tmFirstName/tmFamilyName (separate fields, server-side).
 * `search` from usePaginatedList is mapped onto businessCaseId.
 */
export function listCgrRequests(
  params: ListParams,
  filters: CgrListFilters = {},
): Promise<PagedResponse<CgrRequestListItem>> {
  const query: Record<string, string> = {
    page: params.page,
    pageSize: params.pageSize,
    sorting: params.sorting,
  };
  if (params.search) query.businessCaseId = params.search;
  Object.entries(filters).forEach(([k, v]) => {
    if (v) query[k] = v;
  });
  return get<PagedResponse<CgrRequestListItem>>('/v1/erru/cgr/search', query);
}

/**
 * RSI (RoadSideInspection / Tehnokontrolli teade) — vorm stage only (LJVIS2-147).
 * Eeltäitmine/saatmine (-148) and list (-149) land in later stages.
 *
 * Unlike CTUD/CGR, there is a SINGLE unified save endpoint for both create and revise
 * (branches internally on presence of id, mirroring the control-forms save pattern) —
 * see POST/v1/erru/rsi/request/save.yml. No PUT here.
 */

/** Get one RSI message — always the latest snapshot. */
export function getRsiMessage(id: string): Promise<RsiMessage> {
  return get<RsiMessage>('/v1/erru/rsi/get', { q: id });
}

/**
 * Create or revise an outgoing RSI draft. businessCaseId, status, direction, rsiFrom and
 * rsiTo are server-assigned/derived — never accepted from the client. Pass `id` to revise
 * an existing draft, or leave it empty to create a new one.
 */
export function saveRsiMessage(
  id: string,
  body: RsiMessageWrite,
): Promise<RsiSaveResult> {
  return post<RsiSaveResult>('/v1/erru/rsi/request/save', { id, ...body });
}
