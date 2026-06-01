import { get, post } from '../../shared/api/client';
import type { Classifier, ClassifierValue } from './types.ts';

export const listClassifiers = (params?: {
  search?: string;
  page?: string;
  pageSize?: string;
  sorting?: string;
}) => get<Classifier[]>('/classifiers/list', params as Record<string, string>);

export const getClassifier = (id: string) =>
  get<Classifier[]>('/classifiers/get', { id });

export const getClassifierValues = (params: {
  classifierId: string;
  search?: string;
  page?: string;
  pageSize?: string;
  sorting?: string;
}) =>
  get<ClassifierValue[]>(
    '/classifiers/get-values',
    params as Record<string, string>,
  );

export const updateClassifier = (data: {
  id: string;
  name: string;
  description: string;
}) => post<Classifier[]>('/classifiers/update', data);
