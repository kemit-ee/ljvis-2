export interface ControlForm {
  labelKey: string;
  route: string;
  hasParent: boolean;
}

export interface ForeignViolationForm {
  id?: string;
  formNumber: string;
  reportingCountryCode: string;
  reportingAuthority: string;
  inspectionCountryCode?: string;
  inspectionDate: string;
  inspectionTime?: string;
  inspectionAddressLine1?: string;
  inspectionAddressLine2?: string;
  inspectionRegion?: string;
  inspectionCity?: string;
  companyRegCode?: string;
  companyName?: string;
  companyCountryCode?: string;
  companyAddressLine1?: string;
  companyAddressLine2?: string;
  companyCity?: string;
  companyPostalCode?: string;
  driverFirstName?: string;
  driverLastName?: string;
  vehicleRegNr?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleCountryCode?: string;
  vehicleVin?: string;
  vehicleFirstRegistration?: string;
  vehicleBodyType?: string;
  licenceCopyNumber?: string;
  violationDescription?: string;
  minorViolationsCount?: string;
  sanctionCode: string;
  sanctionNotes?: string;
  violations: string;
  recommendedMeasureCode: string;
  recommendedMeasureNotes?: string;
  notes?: string;
  dataEntryDate: string;
  inspectorFirstName: string;
  inspectorLastName: string;
  inspectorOrganisationId: string;
  inspectorUnit: string;
  inspectorProfession: string;
  files?: string;
}