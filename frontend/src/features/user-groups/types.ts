export interface UserGroup {
  id: string;
  name: string;
  organisations?: string;
  createdAt?: string;
  updatedAt?: string;
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
}
