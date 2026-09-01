export interface CitizenFormRow {
  formType: string;
  formKey: number;
  compoundFormKey: number | null;
  formNumber: string;
  status: string;
  mainDate: string | null;
  county: string | null;
  vehicleRegNr: string | null;
  companyRegCode: string;
  companyName: string | null;
  hasViolation: boolean;
  total: number;
}

// GET/v1/citizen/risk-scores/my-company.yml response.
export interface CompanyRiskScore {
  riskScore: number | null;
  riskBandCode: 'Hall' | 'Roheline' | 'Kollane' | 'Punane';
  totalControls: number;
  companyName: string | null;
  windowStart: string | null;
  windowEnd: string | null;
}

// One row of GET/v1/citizen/risk-scores/controls.yml's `controls` array —
// one compound_form (control) with its MSI/VSI/SI/MI severity counts and
// weightedPoints contribution to the company's risk score.
export interface CompanyControlRow {
  compoundFormKey: number;
  formNumber: string;
  mainDate: string | null;
  vehicleRegNr: string | null;
  isFullyExcluded: boolean;
  msi: number;
  vsi: number;
  si: number;
  mi: number;
  weightedPoints: number;
}

export interface CompanyControlsBreakdown {
  controls: CompanyControlRow[];
}

// One entry of a sp_driver/sp_teammate violations array element, after
// GET/v1/citizen/forms/compound/sub-forms.yml unifies the 5 EU-regulation
// violation columns into one array (see compound-subforms.sql). vehicle/
// trailer_technical and adr sub-forms reuse the same shape from their own
// single violations/infringements column, just without `regulation`.
export interface CitizenSubFormViolation {
  violationCode?: string;
  code?: string;
  severityCode?: string;
  description?: string;
  regulation?: string;
}

export type CitizenSubFormType =
  | 'sp_driver'
  | 'sp_teammate'
  | 'vehicle_technical'
  | 'trailer_technical'
  | 'adr'
  | 'kv';

// One row of GET/v1/citizen/forms/compound/sub-forms.yml's response —
// one published sub-form snapshot attached to a koondvorm.
export interface CitizenSubForm {
  formType: CitizenSubFormType;
  formKey: number;
  subFormNumber: string;
  status: string;
  resultType: string | null;
  violations: CitizenSubFormViolation[];
  notes: string | null;
}
