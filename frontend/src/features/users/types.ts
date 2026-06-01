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
}

export interface UserListItem extends User {
  page?: number;
  totalPages?: number;
  total?: number;
  isAdditionalGroupRow?: boolean;
}

export interface UserGroupAssignment {
  userGroupId: string;
  name: string;
}
