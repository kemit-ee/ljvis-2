import { get } from '../../shared/api/client';
import type { Organisation } from './types';

export const listOrganisations = () => get<Organisation[]>('/organisations/list');
