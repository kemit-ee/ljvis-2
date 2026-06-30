import { post } from '../../shared/api/client';
import type { Permission } from '../permissions/types.ts';
import type { FormClassifierValue } from '../control-forms/types.ts';

export const getAvailablePerms = (id: number) =>
  post<Permission[]>(`/v1/control-forms/read/get-available-permissions`, {
    id,
  });

export const getAvailableFormClassifierValue = (code: string) =>
  post<FormClassifierValue[]>(
    `/v1/control-forms/read/get-available-form-classifier_value`,
    { code },
  );
