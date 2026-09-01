import { get } from '../../shared/api/client';
import type { ClassifierValueData } from './types';

// Citizen sessions can't pass the officer-only GET/v1/.guard, so citizens
// use GET/v1/citizen/classifier-values (same data, citizen-authority guard).
export const listClassifierValues = (isCitizen: boolean) =>
  get<ClassifierValueData[]>(
    isCitizen ? '/v1/citizen/classifier-values' : '/v1/classifier-values',
  );
