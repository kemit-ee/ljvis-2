import { get, post } from '../../shared/api/client';
import type { ForeignViolationForm } from './types';

export const getSerialNumber = () =>
  get<number>('/v1/forms/foreign-violation/serial-number');

export const insertForeignViolationForm = (
  data: ForeignViolationForm,
) => post<ForeignViolationForm[]>('/v1/control-forms/foreign-violation-form', data as unknown as Record<string, unknown>);
