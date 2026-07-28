export interface FormSnapshot {
  snapshotId: number;
  version: number;
  status: string;
  createdAt: string;
  createdBy: string;
  orgName: string;
}

export interface ControlForm {
  labelKey: string;
  route: string;
  hasParent: boolean;
  parentKey?: string;
  typeParam?: string;
}

export interface ForeignViolationForm {
  id?: string;
  formNumber: string;
  status?: string;
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
  violations?: string[];
  recommendedMeasureCode: string;
  recommendedMeasureNotes?: string;
  notes?: string;
  dataEntryDate: string;
  inspectorFirstName: string;
  inspectorLastName: string;
  inspectorOrganisationId: string;
  inspectorUnit: string;
  inspectorProfession: string;
  files?: { id: string; isLoading: boolean; isValid: boolean }[];
}

export type Trailer = {
  regNr: string;
  countryCode: string;
  make: string;
  model: string;
  vin: string;
  firstRegistration: string;
  bodyType: string;
  categoryCode: string;
  categoryOther: string;
};

export type Driver = {
  personalCodeEe: string;
  firstName: string;
  lastName: string;
  citizenshipCode: string;
  personalCodeForeign: string;
  birthDate: string;
};

export interface CompoundForm {
  id?: string;
  formNumber: string;
  status?: string;
  controlCountryCode?: string;
  address?: string;
  road?: string;
  roadOther?: string;
  kilometer?: string;
  county?: string;
  city?: string;
  controlDate?: string;
  controlTime?: string;
  road_type?: string;
  vehicleRegNr?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleCountryCode?: string;
  vehicleVin?: string;
  vehicleFirstRegistration?: string;
  vehicleBodyType?: string;
  vehicleCategoryCode?: string;
  vehicleCategoryOther?: string;
  vehicleMileage?: string;
  roadTaxStatus?: string;
  roadTaxNotes?: string;
  trailers?: Trailer[];
  companyRegCode?: string;
  companyName?: string;
  companyCountryCode?: string;
  companyCounty?: string;
  companyCity?: string;
  companyAddressLine1?: string;
  companyPostalCode?: string;
  companyOwnerFirstName?: string;
  companyOwnerLastName?: string;
  companyActivityLicenceCopyNumber?: string;
  drivers?: Driver[];
  inspectorFirstName?: string;
  inspectorLastName?: string;
  inspectorOrganisationId?: string;
  inspectorUnit?: string;
  inspectorProfession?: string;
}

export interface DriveRestForm {
  id?: string;
  compoundFormKey?: number;
  subFormNumber?: string;
  templateVersion?: number;
  status?: string;
  selectionStatus?: string;
  transportType?: string;
  transportEmptyRun?: boolean;
  transportNature?: string;
  transportNatureExempt?: boolean;
  transportClasses?: TransportClass[];
  cabotageViolations?: CabotageViolation[];
  resultType?: string;
  proceedingType?: string;
  proceedingReferenceNumber?: string;
  documentChecks?: DocumentCheck[];
  otherDocuments?: OtherDocument[];
  spApplicability?: string;
  tachographTypeCode?: string;
  tachographDataNotDownloaded?: boolean;
  checkedDaysCount?: string;
  workDaysCount?: string;
  otherActivityDaysCount?: string;
  violations5612006?: Violation[];
  violations1652014?: Violation[];
  violations200215?: Violation[];
  violations5932008?: Violation[];
  violations20201057?: Violation[];
  massDimensionNonCompliant?: boolean;
  massDimensionMeasurements?: MassDimensionMeasurement[];
  atpViolationFound?: string;
  atpViolationDescription?: string;
  erruPoints?: string[];
  files?: string[];
  enforcementDecision?: string;
  proceedingClosureBasis?: string;
  notes?: string;
}

export type TransportClass = {
  classCode: string;
  className: string;
};

export type CabotageViolation = {
  violationCode: string;
  severityCode: string;
};

export type DocumentCheck = {
  documentCode: string;
  documentName: string;
  severityCode: string;
  violationCode: string;
  level2Code?: string;
  level2Name?: string;
  level3Code?: string;
  level3Name?: string;
};

export type OtherDocument = {
  documentCode: string;
  documentName: string;
  result: string;
  notes: string;
};

export type Violation = {
  violationCode: string;
  severityCode: string;
  isDetected: string;
};

export interface CheckEntry {
  level1Code: string;
  level1Name: string;
  level2Code: string;
  level2Name: string;
  level2Description: string;
  level3Code: string;
  level3Name: string;
  severity: string;
  note?: string;
  documentCode?: string;
  documentName?: string;
  severityCode?: string;
  violationCode?: string;
  articleDirective?: string;
}

export type MassDimensionMeasurement = {
  measurementType: string;
  axleNumber: string;
  actualValue: string;
  allowedValue: string;
  excessValue: string;
};
