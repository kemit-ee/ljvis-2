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
