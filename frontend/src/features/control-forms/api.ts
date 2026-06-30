import { post } from '../../shared/api/client';
import type { BatchFormClassifierValue } from '../control-forms/types.ts';

export const getAvailableFormClassifierValues = (codes: string[]) =>
  post<BatchFormClassifierValue[]>(
    `/v1/control-forms/read/get-available-form-classifier-values`,
    { codes },
  );
