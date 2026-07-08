import { post } from '../../shared/api/client';
import type { StructureUnit } from './types';

export const listStructureUnits = (organisationId?: number) =>
  post<StructureUnit[]>('/v1/structure-units/list', organisationId ? { organisationId: Number(organisationId) } : {});
