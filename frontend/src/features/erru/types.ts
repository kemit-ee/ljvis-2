/**
 * ERRU CTUD (Check Transport Undertaking Data / Tegevusloa kontroll) types.
 *
 * Mirrors the CtudRequest* schemas in docs/openapi.yaml. Status and response-status
 * codes are stored in English and rendered through the CTUD_REQUEST_STATUS /
 * CTUD_RESPONSE_STATUS / CTUD_DIRECTION classifiers plus i18n — never hardcode the
 * Estonian labels in components.
 */

export type CtudDirection = 'outgoing' | 'incoming';

export type CtudStatus =
  | 'initiated'
  | 'sent'
  | 'responded'
  | 'received'
  | 'answered'
  | 'error';

export type CtudResponseStatusCode =
  | 'Found'
  | 'NotFound'
  | 'Timeout'
  | 'NotAvailable';

export interface CtudAddress {
  address?: string | null;
  postCode?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface CtudCommunityLicence {
  communityLicenceNumber?: string | null;
  communityLicenceStatus?: string | null;
  communityLicenceType?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  withdrawalDate?: string | null;
  suspensionDate?: string | null;
  suspensionExpiryDate?: string | null;
  suspensionOrWithdrawalReason?: string | null;
  licencingAuthority?: string | null;
}

export interface CtudCertifiedTrueCopy {
  trueCopyNumber?: string | null;
  trueCopyIssueDate?: string | null;
  trueCopyExpiryDate?: string | null;
  trueCopySuspensionDate?: string | null;
  trueCopySuspensionExpiryDate?: string | null;
  trueCopyWithdrawalDate?: string | null;
}

/** Present only when responseStatusCode === 'Found'. Stored verbatim as received. */
export interface CtudResponseContent {
  transportUndertakingName?: string | null;
  legalForm?: string | null;
  numberOfEmployees?: number | null;
  numberOfVehicles?: number | null;
  riskRating?: number | null;
  /** Estonia returns 'Grey' until the risk-assessment module (EPIC 16) is delivered. */
  riskBand?: string | null;
  searchMethod?: string | null;
  address?: CtudAddress | null;
  communityLicenceDetails?: CtudCommunityLicence[] | null;
  certifiedTrueCopyDetails?: CtudCertifiedTrueCopy[] | null;
  vehicleRegistrations?: string[] | null;
}

export interface CtudRequestListItem {
  id: string;
  version: number;
  direction: CtudDirection;
  status: CtudStatus;
  businessCaseId: string;
  sentAt: string | null;
  ctudFrom: string | null;
  ctudTo: string | null;
  transportUndertakingName: string | null;
  communityLicenceNumber: string | null;
  vehicleRegistrationNumber: string | null;
  responseStatusCode: CtudResponseStatusCode | null;
  handlerPersonalCode: string | null;
  handlerName: string | null;
}

export interface CtudRequest extends CtudRequestListItem {
  technicalId: string | null;
  workflowId: string | null;
  originatingAuthority: string | null;
  requestSource: string | null;
  requestPurpose: string | null;
  vehicleRegistrationCountry: string | null;
  requestAllVehicles: boolean;
  respondingAuthority: string | null;
  responseStatusMessage: string | null;
  responseContent: CtudResponseContent | null;
  errorMessage: string | null;
  createdAt: string;
  createdBy: string;
}

/** Editable fields of an outgoing draft. */
export interface CtudRequestWrite {
  ctudTo: string;
  originatingAuthority: string;
  requestSource: string;
  requestPurpose: string;
  transportUndertakingName: string;
  communityLicenceNumber: string;
  vehicleRegistrationNumber: string;
  vehicleRegistrationCountry: string;
  requestAllVehicles: string;
}

export interface CtudSaveResult {
  id: number;
  businessCaseId: string;
  version: number;
  status: CtudStatus;
  responseStatusCode?: CtudResponseStatusCode | null;
}

/** Filters of the CTUD request list. All optional; see api.ts for AND/OR semantics. */
export interface CtudListFilters {
  businessCaseId?: string;
  sentFrom?: string;
  sentUntil?: string;
  ctudFrom?: string;
  ctudTo?: string;
  transportUndertakingName?: string;
  communityLicenceNumber?: string;
  vehicleRegistrationNumber?: string;
  handlerPersonalCode?: string;
  status?: string;
  direction?: string;
}

/** A request is editable only while it is an outgoing draft. */
export function isCtudEditable(r: Pick<CtudRequest, 'status' | 'direction'>): boolean {
  return r.direction === 'outgoing' && r.status === 'initiated';
}

/** Sending is allowed from a draft and, deliberately, after a failed send. */
export function isCtudSendable(r: Pick<CtudRequest, 'status' | 'direction'>): boolean {
  return r.direction === 'outgoing' && (r.status === 'initiated' || r.status === 'error');
}

/**
 * ERRU CGR (Check Good Repute / Mainepäring) types.
 *
 * Mirrors erru.cgr_request. cgrTo can be a real country or the broadcast marker 'ZZ'
 * ("Kõik riigid" — not part of the COUNTRY classifier, rendered as a special case, see
 * useCgrForm.ts / CgrListPage.tsx).
 */
export type CgrDirection = 'outgoing' | 'incoming';

export type CgrStatus = 'initiated' | 'sent' | 'received' | 'answered' | 'error';

export interface CgrMemberStateTransportManagerDetails {
  respondingAuthority?: string | null;
  searchMethod?: string | null;
  nameDetails?: {
    familyName?: string | null;
    firstName?: string | null;
    dateOfBirth?: string | null;
    placeOfBirth?: string | null;
  } | null;
  addressDetails?: {
    address?: string | null;
    postCode?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  certificateDetails?: {
    certificateNumber?: string | null;
    certificateIssueDate?: string | null;
    certificateIssueCountry?: string | null;
    certificateValidity?: string | null;
    fitness?: {
      fitnessStatus?: string | null;
      unfitStartDate?: string | null;
      unfitEndDate?: string | null;
    } | null;
  } | null;
  transportUndertakings?: {
    totalManagedUndertakings?: number | null;
    totalManagedVehicles?: number | null;
    undertaking?: Array<{
      transportUndertakingName?: string | null;
      communityLicenceNumber?: string | null;
      communityLicenceStatus?: string | null;
      numberOfVehicles?: number | null;
      address?: {
        address?: string | null;
        postCode?: string | null;
        city?: string | null;
        country?: string | null;
      } | null;
    }> | null;
  } | null;
}

export interface CgrMemberState {
  memberStateCode: string;
  statusCode: 'Found' | 'NotFound' | 'Timeout' | 'NotAvailable';
  statusMessage?: string | null;
  transportManagerDetails?: CgrMemberStateTransportManagerDetails | null;
}

export interface CgrRequest {
  id: string;
  version: number;
  direction: CgrDirection;
  status: CgrStatus;
  businessCaseId: string;
  technicalId: string | null;
  workflowId: string | null;
  sentAt: string | null;
  cgrFrom: string | null;
  cgrTo: string | null;
  originatingAuthority: string | null;
  requestSource: string | null;
  requestPurpose: string | null;
  tmFirstName: string | null;
  tmFamilyName: string | null;
  tmDateOfBirth: string | null;
  tmPlaceOfBirth: string | null;
  tmFirstNameSearchKey: string | null;
  tmFamilyNameSearchKey: string | null;
  certificateNumber: string | null;
  certificateIssueDate: string | null;
  certificateIssueCountry: string | null;
  memberStates: CgrMemberState[] | null;
  handlerPersonalCode: string | null;
  handlerName: string | null;
  errorMessage: string | null;
  createdAt: string;
  createdBy: string;
}

/** Editable fields of an outgoing CGR draft (7A name block and/or 7B certificate block). */
export interface CgrRequestWrite {
  cgrTo: string;
  originatingAuthority: string;
  requestSource: string;
  requestPurpose: string;
  tmFirstName: string;
  tmFamilyName: string;
  tmDateOfBirth: string;
  tmPlaceOfBirth: string;
  certificateNumber: string;
  certificateIssueDate: string;
  certificateIssueCountry: string;
}

export interface CgrSaveResult {
  id: number;
  businessCaseId: string;
  version: number;
  status: CgrStatus;
}

/** Response of POST /v1/erru/cgr/send — the synchronous member-state answer(s). */
export interface CgrSendResult {
  id: string;
  status: CgrStatus;
  businessCaseId: string;
  workflowId: string;
  memberStates: CgrMemberState[];
}

/** Response of POST /v1/erru/cgr/resend — only updatedMemberState changed. */
export interface CgrResendResult extends CgrSendResult {
  updatedMemberState: string;
}

/** A CGR draft is editable only while it is an outgoing draft, same rule as CTUD. */
export function isCgrEditable(r: Pick<CgrRequest, 'status' | 'direction'>): boolean {
  return r.direction === 'outgoing' && r.status === 'initiated';
}

/** Sending is allowed from a draft and, deliberately, after a failed send (see CTUD). */
export function isCgrSendable(r: Pick<CgrRequest, 'status' | 'direction'>): boolean {
  return r.direction === 'outgoing' && (r.status === 'initiated' || r.status === 'error');
}

/**
 * CGR request list row (LJVIS2-140). The list is OUTGOING ONLY per the task
 * specification ("Eesti saadetud... väljaminevad päringud") — unlike the CTUD list,
 * there is no direction column/filter here; search.sql hard-codes direction='outgoing'.
 * responseStatusCode is derived server-side: populated only for a single-country send
 * (cgrTo <> 'ZZ') with exactly one member_states entry; always null for a broadcast
 * request — the per-country breakdown is shown only in the request detail view.
 */
export interface CgrRequestListItem {
  id: string;
  version: number;
  status: CgrStatus;
  businessCaseId: string;
  sentAt: string | null;
  tmFirstName: string | null;
  tmFamilyName: string | null;
  cgrTo: string | null;
  responseStatusCode: CgrMemberState['statusCode'] | null;
  handlerName: string | null;
}

/** Filters of the CGR request list. All optional and AND-combined (see search.sql). */
export interface CgrListFilters {
  businessCaseId?: string;
  tmFirstName?: string;
  tmFamilyName?: string;
  sentFrom?: string;
  sentUntil?: string;
  cgrTo?: string;
  status?: string;
  handlerPersonalCode?: string;
}

/**
 * ERRU RSI (RoadSideInspection / Tehnokontrolli teade) types (LJVIS2-146/-147).
 *
 * Mirrors erru.rsi_message. Unlike CGR, rsiTo is always a single member state (derived
 * from vehicleRegistrationCountry) — there is no broadcast marker. Unlike CTUD/CGR, RSI
 * is ASYNCHRONOUS: 'sent' does not carry a response — it arrives later as a separately
 * correlated message (see LJVIS2-148, a later stage), stored in 'responded'.
 */
export type RsiDirection = 'outgoing' | 'incoming';

export type RsiStatus = 'initiated' | 'sent' | 'responded' | 'received' | 'answered' | 'error';

export type RsiResponseStatusCode = 'OK' | 'NotFound';

export type RsiVehicleHolderType = 'transport_undertaking' | 'owner';
export type RsiOwnerType = 'company' | 'natural_person';

export interface RsiAddress {
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postCode?: string | null;
}

/**
 * Optional "Veoettevõtja või omaniku andmed" choice block. undefined/null when the block
 * was never opened on the form (LJVIS2-147 §Plokk "Veoettevõtja või omaniku andmed").
 */
export interface RsiIdentificationDetails {
  isVehicleHolder: RsiVehicleHolderType;
  isNaturalPerson?: RsiOwnerType | null;
  transportUndertakingName?: string | null;
  communityLicenceNumber?: string | null;
  companyName?: string | null;
  firstName?: string | null;
  familyName?: string | null;
  registrationCertificate?: string | null;
  address: RsiAddress;
}

export type RsiCheckedItemStatus = 'not_checked' | 'checked' | 'non_compliant';
export type RsiDefectSeverity = 'VO' | 'OV' | 'EOV';

export interface RsiCheckedItemDefect {
  defectCode: string;
  severity: RsiDefectSeverity;
}

/** National shape until sent (TECHNICAL_CHECK classifier codes); CAA_10 never present. */
export interface RsiCheckedItem {
  partCode: string;
  status: RsiCheckedItemStatus;
  defects: RsiCheckedItemDefect[];
}

export interface RsiMessage {
  id: string;
  version: number;
  direction: RsiDirection;
  status: RsiStatus;
  businessCaseId: string;
  technicalId: string | null;
  workflowId: string | null;
  sentAt: string | null;
  rsiFrom: string | null;
  rsiTo: string | null;
  originatingAuthority: string | null;
  requestSource: string | null;
  requestPurpose: string | null;
  vehicleCategory: string | null;
  vehicleRegistrationNumber: string | null;
  vehicleRegistrationCountry: string | null;
  vehicleIdentificationNumber: string | null;
  odometerReading: number | null;
  driverFirstName: string | null;
  driverFamilyName: string | null;
  driverLicenceNumber: string | null;
  driverLicenceCountry: string | null;
  identificationDetails: RsiIdentificationDetails | null;
  inspectionIdentifier: string | null;
  inspectionLocation: string | null;
  inspectionDatetime: string | null;
  inspectionAuthorityOrName: string | null;
  inspectionPassed: boolean;
  ptiRequested: boolean;
  vehicleProhibitionOrRestriction: boolean;
  checkedItems: RsiCheckedItem[] | null;
  responseStatusCode: RsiResponseStatusCode | null;
  responseStatusMessage: string | null;
  handlerPersonalCode: string | null;
  handlerName: string | null;
  errorMessage: string | null;
  createdAt: string;
  createdBy: string;
}

/** Editable fields of an outgoing RSI draft (LJVIS2-147). */
export interface RsiMessageWrite {
  originatingAuthority: string;
  requestSource: string;
  requestPurpose: string;
  vehicleCategory: string;
  vehicleRegistrationNumber: string;
  vehicleRegistrationCountry: string;
  vehicleIdentificationNumber: string;
  odometerReading: string;
  driverFirstName: string;
  driverFamilyName: string;
  driverLicenceNumber: string;
  driverLicenceCountry: string;
  /** JSON-stringified RsiIdentificationDetails, or '' when the block is closed. */
  identificationDetails: string;
  inspectionIdentifier: string;
  inspectionLocation: string;
  inspectionDatetime: string;
  inspectionAuthorityOrName: string;
  /** Sent as the literal strings 'true'/'false' — Ruuter allowlist coerces booleans to '' otherwise. */
  inspectionPassed: string;
  ptiRequested: string;
  vehicleProhibitionOrRestriction: string;
  /** JSON-stringified RsiCheckedItem[]. */
  checkedItems: string;
}

export interface RsiSaveResult {
  id: number;
  businessCaseId: string;
  version: number;
  status: RsiStatus;
}

/** An RSI draft is editable only while it is an outgoing draft, same rule as CTUD/CGR. */
export function isRsiEditable(r: Pick<RsiMessage, 'status' | 'direction'>): boolean {
  return r.direction === 'outgoing' && r.status === 'initiated';
}

/**
 * Sending is allowed only from an outgoing draft. Unlike CGR/CTUD, RSI's 'error' is
 * terminal — a failed send is never retried, a new message must be composed instead
 * (see send.yml description).
 */
export function isRsiSendable(r: Pick<RsiMessage, 'status' | 'direction'>): boolean {
  return r.direction === 'outgoing' && r.status === 'initiated';
}

/** Response of POST /v1/erru/rsi/send. */
export interface RsiSendResult {
  id: string;
  status: RsiStatus;
  businessCaseId: string;
  workflowId: string;
  rsiTo: string;
}

/**
 * RSI message list item (LJVIS2-149) — one row per message (latest snapshot).
 * Unlike CGR, shows BOTH incoming and outgoing; direction is a column, not a filter hard-code.
 * responseStatusCode is a direct column from the latest snapshot (no broadcast ZZ derivation).
 */
export interface RsiMessageListItem {
  id: string;
  version: number;
  direction: RsiDirection;
  status: RsiStatus;
  businessCaseId: string;
  sentAt: string | null;
  rsiFrom: string | null;
  rsiTo: string | null;
  vehicleRegistrationNumber: string | null;
  responseStatusCode: RsiResponseStatusCode | null;
  handlerName: string | null;
}

/**
 * Filters of the RSI message list. All optional.
 * businessCaseId and vehicleRegistrationNumber are OR-combined with each other;
 * all other filters are AND-combined (spec: "VÕI-loogika nende vahel, JA-loogika ülejäänutega").
 */
export interface RsiListFilters {
  businessCaseId?: string;
  vehicleRegistrationNumber?: string;
  sentFrom?: string;
  sentUntil?: string;
  rsiFrom?: string;
  rsiTo?: string;
  status?: string;
  direction?: string;
  handlerPersonalCode?: string;
}

/**
 * ERRU NCR (NotifyCheckResult / Kontrollitulemuse teade) types (LJVIS2-62/-63/-64).
 *
 * NCR is the most structurally complex ERRU family: a bilateral exchange where the
 * inspecting MS reports a check result (possibly with penalties already imposed and
 * penalties requested) and the registration MS answers with its own imposed-penalty
 * decisions. Unlike RSI/CGR/CTUD, the "get" endpoint returns the FULL snapshot history
 * (NcrCase.snapshots), not just the latest row — the last element is the current state,
 * the whole array backs the read-only "Juhtumi teadete loend" (LJVIS2-63 §4).
 */
export type NcrDirection = 'outgoing' | 'incoming';

export type NcrStatus =
  | 'initiated'
  | 'sent'
  | 'acknowledged'
  | 'responded'
  | 'received'
  | 'viewed'
  | 'answer_drafted'
  | 'forwarded'
  | 'answered'
  | 'error';

export type NcrCheckResult = 'Pass' | 'Fail' | 'CleanCheck';
export type NcrInfringementCategory = 'MSI' | 'VSI' | 'SI';
export type NcrIsExecuted = 'Yes' | 'No' | 'Unknown';

export interface NcrMinorInfringement {
  dateOfInfringement: string;
  numberOfInfringements: number;
}

/** Penalty the INSPECTING member state itself already imposed at the roadside. */
export interface NcrPenaltyImposed {
  penaltyImposedIdentifier: string;
  penaltyTypeImposed: string;
  finalDecisionDate: string;
  startDate?: string | null;
  endDate?: string | null;
  isExecuted: NcrIsExecuted;
  notExecutedReason?: string | null;
}

/** Penalty the inspecting MS requests the REGISTRATION member state to impose. */
export interface NcrPenaltyRequested {
  penaltyRequestedIdentifier: string;
  penaltyTypeRequested: string;
  duration?: number | null;
}

export interface NcrSeriousInfringement {
  category: NcrInfringementCategory;
  infringementType: string;
  dateOfInfringement: string;
  detectionCheckDate: string;
  appealPossible: boolean;
  penaltiesImposed: NcrPenaltyImposed[];
  penaltiesRequested: NcrPenaltyRequested[];
}

/** Registration MS's answer to one requested penalty — always keyed by the requested id. */
export interface NcrResponsePenaltyImposed {
  penaltyRequestedIdentifier: string;
  authorityImposingPenalty: string;
  isImposed: boolean;
  penaltyTypeImposed: string | null;
  startDate?: string | null;
  endDate?: string | null;
  reason?: string | null;
}

export interface NcrResponseAddress {
  address?: string | null;
  postCode?: string | null;
  city?: string | null;
  country?: string | null;
}

/** One snapshot of an NCR message (INSERT-only — see erru.ncr_message). */
export interface NcrMessage {
  id: string;
  version: number;
  direction: NcrDirection;
  status: NcrStatus;
  preForwardingStatus: string | null;
  businessCaseId: string;
  technicalId: string | null;
  workflowId: string | null;
  sentAt: string | null;
  ncrFrom: string | null;
  ncrTo: string | null;
  originatingAuthority: string | null;
  requestSource: string | null;
  requestPurpose: string | null;
  ackStatusCode: string | null;
  ackStatusMessage: string | null;
  ackReceivedAt: string | null;
  responseStatusCode: string | null;
  responseStatusMessage: string | null;
  transportUndertakingName: string | null;
  communityLicenceNumber: string | null;
  vehicleRegistrationNumber: string | null;
  vehicleRegistrationCountry: string | null;
  checkResult: NcrCheckResult | null;
  checkDate: string | null;
  minorInfringement: NcrMinorInfringement | null;
  seriousInfringements: NcrSeriousInfringement[];
  responsePenaltiesImposed: NcrResponsePenaltyImposed[] | null;
  respondingAuthority: string | null;
  responseNumberOfVehicles: number | null;
  responseCommunityLicenceStatus: string | null;
  responseAddress: NcrResponseAddress | null;
  linkedForeignViolationFormKey: number | null;
  handlerPersonalCode: string | null;
  handlerName: string | null;
  errorMessage: string | null;
  createdAt: string;
  createdBy: string;
}

/** GET /v1/erru/ncr/get response — the whole snapshot history of one case. */
export interface NcrCase {
  snapshots: NcrMessage[];
}

/** Editable fields of an outgoing NCR request draft (LJVIS2-63). */
export interface NcrRequestWrite {
  businessCaseId: string;
  originatingAuthority: string;
  requestSource: string;
  requestPurpose: string;
  ncrTo: string;
  transportUndertakingName: string;
  communityLicenceNumber: string;
  vehicleRegistrationNumber: string;
  vehicleRegistrationCountry: string;
  checkResult: string;
  checkDate: string;
  /** JSON-stringified NcrMinorInfringement, or '' when checkResult is Pass/CleanCheck. */
  minorInfringement: string;
  /** JSON-stringified NcrSeriousInfringement[], or '[]' when checkResult is Pass/CleanCheck. */
  seriousInfringements: string;
}

/** Editable fields of the Estonian response draft to an incoming NCR message (LJVIS2-63). */
export interface NcrResponseWrite {
  businessCaseId: string;
  respondingAuthority: string;
  responseStatusCode: string;
  responseStatusMessage: string;
  responseNumberOfVehicles: string;
  responseCommunityLicenceStatus: string;
  /** JSON-stringified NcrResponseAddress, or ''. */
  responseAddress: string;
  /** JSON-stringified NcrResponsePenaltyImposed[]. */
  responsePenaltiesImposed: string;
  /** May be corrected by Estonia from registry data when responding. */
  transportUndertakingName: string;
  /** May be corrected by Estonia from registry data when responding. */
  communityLicenceNumber: string;
}

export interface NcrSaveResult {
  id: number;
  businessCaseId: string;
  version: number;
  status: NcrStatus;
}

/** Eeltäitmine input (LJVIS2-64 §4.1) — "Lisa NCR vorm" from an SP/TH control-form sub-form. */
export interface NcrBuildRequest {
  spFormKey: string;
  spFormType: 'driver' | 'teammate';
  originatingAuthority: string;
  requestSource: string;
  requestPurpose: string;
  ncrTo: string;
}

/** Outgoing draft: editable only while status='initiated' (LJVIS2-63 §4). */
export function isNcrRequestEditable(m: Pick<NcrMessage, 'status' | 'direction'>): boolean {
  return m.direction === 'outgoing' && m.status === 'initiated';
}

/** Incoming response draft: editable while status is 'viewed' or 'answer_drafted'. */
export function isNcrResponseEditable(m: Pick<NcrMessage, 'status' | 'direction'>): boolean {
  return m.direction === 'incoming' && (m.status === 'viewed' || m.status === 'answer_drafted');
}

/** Outgoing request sendable from 'initiated' (first send) or 'error' (retry). */
export function isNcrRequestSendable(m: Pick<NcrMessage, 'status' | 'direction'>): boolean {
  return m.direction === 'outgoing' && (m.status === 'initiated' || m.status === 'error');
}

/** Incoming response sendable from 'answer_drafted' (first send) or 'error' (retry). */
export function isNcrResponseSendable(m: Pick<NcrMessage, 'status' | 'direction'>): boolean {
  return m.direction === 'incoming' && (m.status === 'answer_drafted' || m.status === 'error');
}

/**
 * NCR case list item (LJVIS2-65) — one row per case (ncr_message_key), latest snapshot.
 * hasInfringement drives the red-row highlight (computed server-side from
 * serious_infringements presence).
 */
export interface NcrCaseListItem {
  id: string;
  version: number;
  direction: NcrDirection;
  status: NcrStatus;
  businessCaseId: string;
  sentAt: string | null;
  ncrFrom: string | null;
  ncrTo: string | null;
  transportUndertakingName: string | null;
  handlerName: string | null;
  hasInfringement: boolean;
}

/** Filters of the NCR case list. All optional, AND-combined (LJVIS2-65 §4 "Filtrid"). */
export interface NcrListFilters {
  businessCaseId?: string;
  sentFrom?: string;
  sentUntil?: string;
  ncrFrom?: string;
  ncrTo?: string;
  status?: string;
  direction?: string;
  handlerPersonalCode?: string;
}
