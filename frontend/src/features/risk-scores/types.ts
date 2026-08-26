export type RiskBandCode = 'Hall' | 'Roheline' | 'Kollane' | 'Punane';

export interface RiskScoreListItem {
  companyName: string | null;
  companyRegCode: string;
  riskScore: number | null;
  riskBandCode: RiskBandCode;
  totalControls: number;
}

export interface RiskScoreListFilters {
  companyName?: string;
  regCode?: string;
  riskBand?: string;
}
