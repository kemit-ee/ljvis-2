export interface UserGroup {
  id: string;
  name: string;
  organisations?: string[];
  createdAt?: string;
  updatedAt?: string;
  isAdditionalGroupRow?: boolean;
  coversAllOrganisations?: boolean;
}

export interface UserGroupOrganisation {
  organisationId: string;
  name: string;
}

export interface UserGroupPermission {
  permissionId: string;
  code: string;
  description: string;
}

export interface UserGroupUser {
  id: string;
  firstName: string;
  lastName: string;
  personalCode: string;
  organisationName: string;
  status: string;
  isAdditionalGroupRow?: boolean;
}
