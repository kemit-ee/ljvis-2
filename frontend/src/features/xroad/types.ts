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
