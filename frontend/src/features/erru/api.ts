import { get, post, put } from '../../shared/api/client';
import type { ListParams, PagedResponse } from '../../hooks/usePaginatedList';
import type {
  CgrListFilters,
  CgrRequest,
  CgrRequestListItem,
  CgrRequestWrite,
  CgrResendResult,
  CgrSaveResult,
  CgrSendResult,
  CtudListFilters,
  CtudRequest,
  CtudRequestListItem,
  CtudRequestWrite,
  CtudSaveResult,
  NcrBuildRequest,
  NcrCase,
  NcrCaseListItem,
  NcrListFilters,
  NcrRequestWrite,
  NcrResponseWrite,
  NcrSaveResult,
  RsiListFilters,
  RsiMessage,
  RsiMessageListItem,
  RsiMessageWrite,
  RsiSaveResult,
  RsiSendResult,
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
 * CGR (Check Good Repute / Mainepäring) — LJVIS2-138 (vorm) + LJVIS2-139 (tegevused).
 *
 * Draft create/revise URLs are nested one level deeper than CTUD's bare '/v1/erru/ctud'
 * — CGR needs its own guard-isolated directory, since cgr.create and cgr.send can't
 * share a Ruuter guard on the same bare 'erru/cgr/' directory. See
 * DSL/Ruuter/ljvis/POST/v1/erru/cgr/draft/.guard vs DSL/Ruuter/ljvis/POST/v1/erru/cgr/.guard.
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
 * Send a CGR request to its target member state(s). Synchronous: the answer(s) are
 * stored before this resolves. cgrTo='ZZ' (broadcast) returns one memberStates entry per
 * member state in a single call; a single-country send returns exactly one entry.
 * Timeout/NotAvailable are successful outcomes; only a transport failure yields 502 and
 * moves the request to 'error', from which sending may be retried.
 */
export function sendCgrRequest(id: string): Promise<CgrSendResult> {
  return post<CgrSendResult>('/v1/erru/cgr/send', { id });
}

/**
 * Re-send to a single member state of an already-sent (typically broadcast) request —
 * only the targeted memberStateCode entry is replaced, the rest of memberStates and the
 * workflowId are left untouched. A transport failure here does NOT move the request to
 * 'error' (status stays 'sent'), so it can be retried immediately.
 */
export function resendCgrRequest(
  id: string,
  memberStateCode: string,
): Promise<CgrResendResult> {
  return post<CgrResendResult>('/v1/erru/cgr/resend', { id, memberStateCode });
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
 * RSI (RoadSideInspection / Tehnokontrolli teade) — LJVIS2-147 (vorm) + LJVIS2-148 (send).
 * Eeltäitmine ("Lisa RSI teade" from an existing inspection card) is backend-ready
 * (POST/v1/erru/rsi/request/build.yml) but has no frontend entry point yet — the
 * inspection card it would hang off of belongs to a different feature/epic.
 *
 * Unlike CTUD/CGR, there is a SINGLE unified save endpoint for both create and revise
 * (branches internally on presence of id, mirroring the control-forms save pattern) —
 * see POST/v1/erru/rsi/request/save.yml. No PUT here.
 */

/**
 * RSI message list (LJVIS2-149) — both incoming and outgoing.
 * businessCaseId and vehicleRegistrationNumber are OR-combined (server-side); all other
 * filters are AND-combined. Default sort is sent_at desc (newest first).
 */
export function listRsiMessages(
  params: ListParams,
  filters: RsiListFilters = {},
): Promise<PagedResponse<RsiMessageListItem>> {
  const query: Record<string, string> = {
    page: params.page,
    pageSize: params.pageSize,
    sorting: params.sorting,
  };
  Object.entries(filters).forEach(([k, v]) => {
    if (v) query[k] = v;
  });
  return get<PagedResponse<RsiMessageListItem>>('/v1/erru/rsi/search', query);
}

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

/**
 * Send an outgoing RSI draft. Asynchronous and single-country: this only returns the
 * ACK (workflowId) — the actual vehicle-check result (responded/NotFound) arrives later
 * via a separate inbound-response call, correlated by workflowId. A transport failure
 * moves the message to 'error', which is terminal for RSI — no retry, a new message
 * must be composed instead (see send.yml).
 */
export function sendRsiMessage(id: string): Promise<RsiSendResult> {
  return post<RsiSendResult>('/v1/erru/rsi/send', { id });
}

/**
 * NCR (NotifyCheckResult / Kontrollitulemuse teade) — LJVIS2-62/-63/-64.
 *
 * Get returns the FULL snapshot history keyed by businessCaseId (not the latest row) —
 * see NcrCase. request/save and response/save are the two "vorm" (Stage 10) endpoints;
 * request/build, send and response-send are the "tegevused" (Stage 11) endpoints. send
 * lives at /v1/erru/ncr/send (not request/send) and response-send at
 * /v1/erru/ncr/response-send (not response/send) — a deliberate deviation from the
 * spec's literal paths so ncr.send can be its own guard, isolated from ncr.create
 * (request/.guard) and ncr.respond (response/.guard). See send.yml/response-send.yml.
 */
export function getNcrCase(businessCaseId: string): Promise<NcrCase> {
  return get<NcrCase>('/v1/erru/ncr/get', { q: businessCaseId });
}

/** Create (businessCaseId='') or revise (existing businessCaseId) an outgoing NCR draft. */
export function saveNcrRequest(body: NcrRequestWrite): Promise<NcrSaveResult> {
  return post<NcrSaveResult>('/v1/erru/ncr/request/save', { ...body });
}

/** Save/revise the Estonian response draft to an incoming NCR message. */
export function saveNcrResponse(body: NcrResponseWrite): Promise<NcrSaveResult> {
  return post<NcrSaveResult>('/v1/erru/ncr/response/save', { ...body });
}

/** Eeltäitmine: build a new outgoing NCR draft from an SP/TH control-form sub-form. */
export function buildNcrRequest(body: NcrBuildRequest): Promise<NcrSaveResult> {
  return post<NcrSaveResult>('/v1/erru/ncr/request/build', { ...body });
}

/** Send the outgoing NCR request draft to ERRU (initiated/error -> sent -> acknowledged). */
export function sendNcrRequest(businessCaseId: string): Promise<{ businessCaseId: string; status: string; ackStatusCode: string; workflowId?: string }> {
  return post('/v1/erru/ncr/send', { businessCaseId });
}

/** Send the composed response to an incoming NCR message (answer_drafted/error -> answered). */
export function sendNcrResponse(businessCaseId: string): Promise<{ businessCaseId: string; status: string; ackStatusCode: string }> {
  return post('/v1/erru/ncr/response-send', { businessCaseId });
}

/**
 * NCR case list (LJVIS2-65) — both incoming and outgoing, one row per case. All filters
 * are AND-combined (unlike RSI/CGR's OR-pair — NCR has only one text filter). Protected
 * by the ncr.list permission (distinct from ncr.read). Default sort is sent_at desc.
 */
export function listNcrCases(
  params: ListParams,
  filters: NcrListFilters = {},
): Promise<PagedResponse<NcrCaseListItem>> {
  const query: Record<string, string> = {
    page: params.page,
    pageSize: params.pageSize,
    sorting: params.sorting,
  };
  Object.entries(filters).forEach(([k, v]) => {
    if (v) query[k] = v;
  });
  return get<PagedResponse<NcrCaseListItem>>('/v1/erru/ncr/list/search', query);
}
