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
