import type { ClassifierValueData } from '../classifier-values/types';
import type { ClassifierBundleValue } from './api';
import type { ClassifierEntry } from './types';

export const fromClassifierValueData = (
  data: ClassifierValueData,
): ClassifierEntry => ({
  classifierValueKey: data.classifierValueKey,
  classifierCode: data.classifierCode,
  code: data.code,
  name: data.name,
  nameEn: data.nameEn,
  parentKey: data.parentKey ?? null,
  description: data.description,
  validFrom: data.validFrom,
  validUntil: data.validUntil,
  isValid: data.isValid ?? true,
});

export const fromClassifierBundleValue = (
  data: ClassifierBundleValue,
): ClassifierEntry => ({
  classifierValueKey: data.classifierValueId,
  classifierCode: data.classifierCode,
  classifierName: data.classifierName,
  code: data.code,
  name: data.name,
  parentKey: data.parentKey,
  validFrom: data.validFrom,
  validUntil: data.validUntil,
  isValid: data.isValid,
});
