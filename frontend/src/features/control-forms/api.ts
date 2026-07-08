import { post } from '../../shared/api/client';
import type { ForeignViolationForm } from './types';

export const getSerialNumber = () =>
    post<number>('/v1/forms/foreign-violation/read/get-serial-number', {});

export const insertForeignViolationForm = (
  data: ForeignViolationForm,
) => post<ForeignViolationForm[]>(`/v1/control-forms/foreign-violation-form/edit/insert`, data as unknown as Record<string, unknown>);
