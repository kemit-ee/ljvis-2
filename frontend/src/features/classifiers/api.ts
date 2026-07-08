import { post } from '../../shared/api/client';
import type {
  PagedResponse,
  ListApiParams,
} from '../../hooks/usePaginatedList';
import type { Classifier, ClassifierValue } from './types.ts';

export const listClassifiers = (params?: ListApiParams) =>
  post<PagedResponse<Classifier>>(
    '/v1/classifiers/read/list',
    params as Record<string, unknown>,
  );

export const getClassifier = (id: string) =>
  post<Classifier[]>('/v1/classifiers/read/get', { id });

export const getClassifierValues = (params: {
  classifierId: string;
  search?: string;
  page?: string;
  pageSize?: string;
  sorting?: string;
}) =>
  post<PagedResponse<ClassifierValue>>(
    '/v1/classifiers/read/get-values',
    params as Record<string, unknown>,
  );

export const updateClassifier = (data: {
  id: string;
  name: string;
  description: string;
}) => post<Classifier[]>('/v1/classifiers/edit/update', data);

export const insertClassifierValue = (data: {
  classifierId: string;
  code: string;
  name: string;
  validFrom: string;
  validUntil: string;
}) => post<ClassifierValue[]>('/v1/classifiers/values/insert', data);

export const getClassifierValue = (classifierValueId: string) =>
  post<PagedResponse<ClassifierValue>>('/v1/classifiers/read/get-value', {
    classifierValueId,
  });

export const updateClassifierValue = (data: {
  classifierId: string;
  classifierValueId: string;
  code: string;
  name: string;
  validFrom: string;
  validUntil: string;
}) => post<ClassifierValue[]>('/v1/classifiers/values/update', data);
