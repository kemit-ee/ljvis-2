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
