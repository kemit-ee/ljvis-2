export type DashboardScope = 'own' | 'organisation';

export interface DashboardSubForm {
  formType: string;
  formKey: number;
  formNumber: string;
  status: string;
  proceedingType: string | null;
}

export interface DashboardCompoundCase {
  compoundFormKey: number;
  formNumber: string;
  status: string;
  controlDate: string;
  controlTime: string;
  vehicleRegNr: string | null;
  companyName: string | null;
  inspectorName: string | null;
  driverName: string | null;
  subForms: DashboardSubForm[];
}

export interface DashboardStandaloneForm {
  formType: string;
  formKey: number;
  formNumber: string;
  status: string;
  mainDate: string;
  mainTime: string | null;
  vehicleRegNr: string | null;
}

export interface DashboardAttentionItem {
  compoundFormKey: number;
  formNumber: string;
  formType: string;
  formKey: number;
  subFormNumber: string;
  proceedingType: string;
  deadlineAt: string;
  reason: 'overdue' | 'upcoming';
}

export interface DashboardSummary {
  scope: DashboardScope;
  canSeeOrganisation: boolean;
  activeCompoundForms: DashboardCompoundCase[];
  activeStandaloneForms: DashboardStandaloneForm[];
  needsAttention: DashboardAttentionItem[];
}
