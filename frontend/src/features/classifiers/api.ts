import { get } from '../../shared/api/client';
import type { Classifier } from './types.ts';

export const listClassifiers = (params?: { search?: string; page?: string; pageSize?: string; sorting?: string }) =>
  get<Classifier[]>('/classifiers/list', params as Record<string, string>);
