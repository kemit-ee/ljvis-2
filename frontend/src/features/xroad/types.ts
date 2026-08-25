export interface XRoadCompany {
  registryCode: string;
  companyName: string;
  legalForm?: string;
  status: string;
  statusText: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface XRoadPerson {
  personalCode: string;
  firstName: string;
  lastName: string;
  citizenshipCode?: string;
  citizenshipName?: string;
  dateOfBirth?: string;
  personStatus?: string;
}

export interface XRoadAssociatedPerson {
  personType: 'F' | 'J';
  role: string;
  roleText: string;
  firstName?: string;
  nameOrBusinessName: string;
  identityCode: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface XRoadVehicle {
  registrationNumber: string;
  registrationCountryCode: string;
  make?: string;
  model?: string;
  vin?: string;
  bodyType?: string;
  categoryCode?: string;
  firstRegistrationDate?: string;
}

/**
 * LJVIS2-56: e-Toimik AnnaIsikuKvalifikatsioonid — väärteomenetluse
 * kvalifikatsiooni andmed. Nesting mirrors the SOAP response 1:1
 * (proceedings -> actions -> participants -> sanctions ->
 * convictionPoints -> qualificationParagraphs); field names are the
 * English translations applied server-side (see kvalifikatsioonid.yml).
 */
export interface EtoimikLegalBasis {
  objectId?: number;
  codexCode?: number;
  typeCode?: number;
  paragraph?: string;
  paragraphPrim?: string;
  subsection?: string;
  subsectionPrim?: string;
  point?: string;
  pointPrim?: string;
  text?: string;
  shortText?: string;
  validFrom?: string;
  validTo?: string;
  chapterNumber?: string;
  chapterNameCode?: number;
  sectionNumber?: string;
  sectionNameCode?: number;
  divisionNumber?: string;
  divisionNameCode?: number;
}

export interface EtoimikPerson {
  objectId?: number;
  personalCode?: string;
  lastName?: string;
  firstName?: string;
  foreignCodes?: string;
}

export interface EtoimikConvictionPoint {
  objectId?: number;
  verdictCode?: number;
  verdictDate?: string;
  startDate?: string;
  endDate?: string;
  closureDate?: string;
  reference?: string;
  clientSystemId?: string;
  qualificationParagraphs: EtoimikLegalBasis[];
}

export interface EtoimikSanction {
  objectId?: number;
  typeCode?: number;
  subTypeCode?: number;
  subSubTypeCode?: number;
  convictionPoints: EtoimikConvictionPoint[];
}

export interface EtoimikParticipant {
  person: EtoimikPerson;
  sanctions: EtoimikSanction[];
}

export interface EtoimikAction {
  objectId?: number;
  typeCode?: number;
  subTypeCode?: number;
  legalBasis: EtoimikLegalBasis[];
  participants: EtoimikParticipant[];
}

export interface EtoimikProceeding {
  objectId?: number;
  proceedingNumber?: string;
  actions: EtoimikAction[];
}

export interface EtoimikCase {
  objectId?: number;
  typeCode?: number;
  caseNumber?: string;
  proceedings: EtoimikProceeding[];
}
