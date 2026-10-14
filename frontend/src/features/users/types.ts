export interface User {
  id: string;
  firstName: string;
  lastName: string;
  personalCode: string;
  organisationId: string;
  organisationName?: string;
  structuralUnitId: string | null;
  structuralUnitName?: string;
  jobTitleName?: string;
  email: string;
  phone?: string;
  accessStart: string;
  accessEnd: string | null;
  status: 'active' | 'pending_deactivation' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
  userGroups?: string[];
  lastLoginAt: string | null;
}

/** Nimekirjarida (GET /v1/users/{scope}/search): võtmed tulevad Resql-ist numbritena. */
export interface UserListItem extends Omit<User, 'id' | 'organisationId'> {
  id: number;
  organisationId: number;
  isAdditionalGroupRow?: boolean;
}

export interface UserGroupAssignment {
  userGroupId: string;
  name: string;
}
