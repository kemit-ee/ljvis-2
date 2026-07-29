import { get, post, put } from '../../shared/api/client';
import type {
  PagedResponse,
  ListApiParams,
} from '../../hooks/usePaginatedList';
import type { Classifier, ClassifierValue } from './types.ts';

export interface ClassifierBundleValue {
  classifierId: number;
  classifierCode: string;
  classifierName: string;
  classifierValueId: number;
  parentKey: number | null;
  code: string;
  name: string;
  validFrom: string;
  validUntil: string | null;
  isValid: boolean;
}

/**
 * Bulk bundle of all classifiers + values, gated by `classifier.read`.
 * Prefer the `ClassifierProvider`/`useClassifiers()` cache for form dropdowns —
 * this is only wired up directly for validity-aware admin-only use cases.
 * See docs/classifier-caching.md.
 */
export const getClassifiersBundle = () =>
  get<ClassifierBundleValue[]>('/v1/classifiers/bundle');

export const listClassifiers = (params?: ListApiParams) =>
  get<PagedResponse<Classifier>>(
    '/v1/classifiers',
    params as Record<string, string>,
  );

export const getClassifier = (id: string) =>
  get<Classifier[]>('/v1/classifiers/classifier', { q: id });

export const getClassifierValues = (params: {
  classifierId: string;
  search?: string;
  page?: string;
  pageSize?: string;
  sorting?: string;
}) =>
  get<PagedResponse<ClassifierValue>>(
    '/v1/classifiers/values',
    params as Record<string, string>,
  );

export const updateClassifier = (data: {
  id: string;
  name: string;
  description: string;
}) => put<Classifier[]>('/v1/classifiers', data);

export const insertClassifierValue = (data: {
  classifierId: string;
  code: string;
  name: string;
  validFrom: string;
  validUntil: string;
}) => post<ClassifierValue[]>('/v1/classifiers/value', data);

export const getClassifierValue = (
  classifierId: string,
  classifierValueId: string,
) =>
  get<ClassifierValue[]>(
    '/v1/classifiers/value',
    { q: classifierId, valueId: classifierValueId },
  );

export const updateClassifierValue = (data: {
  classifierId: string;
  classifierValueId: string;
  code: string;
  name: string;
  validFrom: string;
  validUntil: string;
}) => put<ClassifierValue[]>('/v1/classifiers/value', data);
