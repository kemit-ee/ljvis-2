import { post } from '../../shared/api/client';
import type { ForeignViolationForm } from './types';

export const insertForeignViolationForm = (
  data: ForeignViolationForm,
) => post<ForeignViolationForm[]>(`/v1/control-forms/foreign-violation-form/insert`, data as unknown as Record<string, unknown>);
