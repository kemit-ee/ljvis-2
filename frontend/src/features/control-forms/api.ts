import { get, post } from '../../shared/api/client';
import type { ForeignViolationForm } from './types';

export const getForm = (id: number) =>
    get<ForeignViolationForm>('/v1/control-forms/foreign-violation-form', { q: String(id) });

export const insertForeignViolationForm = (
  data: ForeignViolationForm,
) => post<ForeignViolationForm[]>('/v1/control-forms/foreign-violation-form', data as unknown as Record<string, unknown>);
