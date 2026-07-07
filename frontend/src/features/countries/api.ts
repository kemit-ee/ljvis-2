import { get } from '../../shared/api/client';
import type { Country } from './types';

export const listCountries = () =>
  get<Country[]>('/v1/countries');
