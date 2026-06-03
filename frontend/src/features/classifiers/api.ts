import { get, post } from '../../shared/api/client';
import type { PagedResponse, ListApiParams } from '../../hooks/usePaginatedList';
import type { Classifier, ClassifierValue } from './types.ts';

export const listClassifiers = (params?: ListApiParams) =>
  get<PagedResponse<Classifier>>('/classifiers/list', params as Record<string, string>);

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

export const insertClassifierValue = (data: {
  classifierId: string;
  code: string;
  name: string;
  validFrom: string;
  validUntil: string;
}) => post<ClassifierValue[]>('/classifiers/insert-value', data);

export const getClassifierValue = (classifierValueId: string) =>
  get<ClassifierValue[]>('/classifiers/get-value', { classifierValueId });

export const updateClassifierValue = (data: {
  classifierId: string;
  classifierValueId: string;
  code: string;
  name: string;
  validFrom: string;
  validUntil: string;
}) => post<ClassifierValue[]>('/classifiers/update-value', data);
