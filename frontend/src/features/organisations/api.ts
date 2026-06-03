import { post } from '../../shared/api/client';
import type { Organisation } from './types';

export const listOrganisations = () =>
  post<Organisation[]>('/v1/organisations/list', {});
