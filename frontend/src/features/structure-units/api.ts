import { get } from '../../shared/api/client';
import type { StructureUnit } from './types';

export const listStructureUnits = (organisationId?: number) =>
  get<StructureUnit[]>('/v1/structure-units', organisationId ? { organisationId: String(organisationId) } : {});
