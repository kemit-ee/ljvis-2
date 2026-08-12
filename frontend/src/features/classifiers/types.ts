export interface Classifier {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt?: string;
  createdBy?: string;
}

export interface ClassifierValue {
  classifierId: string;
  classifierValueId: string;
  code: string;
  name: string;
  validFrom: string;
  validUntil: string;
  isValid?: string;
}

/**
 * Normalized shape used app-wide for classifier value lookups (form dropdowns,
 * violation pickers, etc). Produced by `features/classifiers/adapters.ts` from
 * either backend source (`/v1/classifier-values` or `/v1/classifiers/bundle`).
 * See `docs/classifier-caching.md` for the full architecture.
 */
export interface ClassifierEntry {
  classifierValueKey: number;
  classifierCode: string;
  classifierName?: string;
  code: string;
  name: string;
  nameEn?: string;
  parentKey: number | null;
  description?: string;
  validFrom?: string;
  validUntil?: string | null;
  isValid?: boolean;
}
