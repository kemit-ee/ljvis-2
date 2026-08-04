export interface FormAttachment {
  id: string;
  formNumber?: string;
  fileName: string;
  s3Key?: string;
  status?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface ControlsMatrixRow {
  /** classifier_value_key of a TRANSPORT_TYPE classifier value. */
  transportClass: number;
  analogRecorderDrivers?: number;
  digitalRecorderDrivers?: number;
  smartRecorderDrivers?: number;
  analogRecorderWorkDays?: number;
  digitalRecorderWorkDays?: number;
  smartRecorderWorkDays?: number;
}

export interface ViolationEntry {
  /** classifier_value_key values within the DRIVING_VIOLATION classifier. */
  level1ValueKey: number;
  level2ValueKey: number;
  level3ValueKey?: number;
  quantity: number;
}

export interface LabourInspectionForm {
  id?: string;
  /** Immutable core act number, format ti-AAAA-NNNNN (no /V suffix — see `version`). */
  formNumber?: string;
  /** The /V display suffix of the act number; join as `${formNumber}/${version}` for display. */
  version?: number;
  status?: string;
  inspectorName: string;
  inspectionDate: string;
  externalInspectionId?: string;
  inspectionType: string;
  companyName: string;
  companyRegCode: string;
  vehicleCount?: string;
  totalDriversCount?: string;
  controlsMatrix?: ControlsMatrixRow[];
  prescriptionComposed?: boolean;
  punishedPersonIdCode?: string;
  punishedPersonFirstName?: string;
  punishedPersonLastName?: string;
  proceedingReferenceNumber?: string;
  enforcementDecision?: string;
  proceedingClosureBasis?: string;
  violations?: ViolationEntry[];
  createdBy?: string;
}

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

/** LJVIS2-72: shared "vehicle" | "trailer" technical roadworthiness check sub-form. */
export type TechnicalCheckVariant = 'vehicle' | 'trailer';

export type PartSummaryStatus = 'not_checked' | 'checked' | 'non_compliant';

export type PartSummaryEntry = {
  /** TECHNICAL_CHECK level-1 classifier value code, e.g. "CAA_1". */
  partCode: string;
  status: PartSummaryStatus;
};

export type PartSeverity = 'VO' | 'OV' | 'EOV';

export type PartDefectEntry = {
  partCode: string;
  /** TECHNICAL_CHECK level-2 classifier value code, e.g. "CAA_1.1". */
  defectCode: string;
  severity: PartSeverity;
};

export interface TechnicalCheckForm {
  id?: string;
  compoundFormKey?: number;
  subFormNumber?: string;
  version?: number;
  status?: string;
  partsSummary?: PartSummaryEntry[];
  partsDefects?: PartDefectEntry[];
  resultType?: string;
  resultTransportInterruption?: boolean;
  eraYvMntRegnr?: boolean;
  eraYvMntVintin?: boolean;
  eraYvMntAxles?: boolean;
  eraYvMntPlaces?: boolean;
  eraYvMntRebuilt?: boolean;
  proceedingType?: string;
  proceedingReferenceNumber?: string;
  violations?: string[];
  notes?: string;
  extraordinaryInspectionDate?: string;
  enforcementDecision?: string;
  proceedingClosureBasis?: string;
  createdBy?: string;
}

export interface TechnicalCheckFormListItem {
  id: string;
  subFormNumber: string;
  version: number;
  status: string;
  resultType: string;
}

/** LJVIS2-74: autoveo katkestamise kontrollvorm (transport-interruption / kv_form) sub-form. */
export interface TransportInterruptionForm {
  id?: string;
  compoundFormKey?: number;
  subFormNumber?: string;
  version?: number;
  status?: string;
  headerText?: string;
  residenceCountry?: string;
  residenceRegion?: string;
  residenceCity?: string;
  residenceAddressLine?: string;
  residencePostalCode?: string;
  interruptionReason?: string;
  legalBases?: string[];
  terminationCondition?: string;
  personApplications?: string;
  createdBy?: string;
}

export interface TransportInterruptionFormListItem {
  id: string;
  subFormNumber: string;
  version: number;
  status: string;
}
