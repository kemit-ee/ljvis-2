import { post } from '../../shared/api/client';
import type { User } from '../users/types';

export const insertForeignViolationForm = (
  data: {
    firstName: string;
    lastName: string;
    personalCode: string;
    organisationId: string;
    structuralUnitName: string;
    jobTitleName: string;
    email: string;
    phone: string;
    accessStart: string;
    accessEnd: string;
  },
) => post<User[]>(`/v1/users/edit/insert`, data);
