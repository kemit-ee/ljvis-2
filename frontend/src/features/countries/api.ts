import { post } from '../../shared/api/client';
import type { Country } from './types';

export const listCountries = () =>
  post<Country[]>('/v1/countries/list', {});
