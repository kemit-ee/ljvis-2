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
