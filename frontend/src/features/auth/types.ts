export interface AuthUser {
  id: string;
  firstname: string;
  lastname: string;
  personalcode: string;
  organisationid: string;
  organisationname: string;
  structuralunit: string;
  jobtitle: string;
  email: string;
  status: string;
  permissions: string | string[];
}
