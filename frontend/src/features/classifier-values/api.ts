import { get } from '../../shared/api/client';
import type { ClassifierValueData } from './types';

export const listClassifierValues = () =>
  get<ClassifierValueData[]>('/v1/classifier-values');
