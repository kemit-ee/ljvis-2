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
