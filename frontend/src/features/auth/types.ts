export type RepresentationRole = 'officer' | 'citizen-self' | 'company';

export interface RepresentedCompany {
  registryCode: string;
  companyName: string;
}

export interface AuthUser {
  id?: string;
  firstname: string | null;
  lastname: string | null;
  personalcode: string;
  organisationid: string | null;
  organisationname: string | null;
  structuralunit?: string;
  jobtitle?: string;
  email?: string;
  status?: string;
  permissions: string | string[];
  officerAvailable: boolean;
  activeRole: RepresentationRole;
  activeRegistryCode: string | null;
  representedCompanies: RepresentedCompany[];
}
