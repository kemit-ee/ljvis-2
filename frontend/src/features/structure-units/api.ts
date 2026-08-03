import { get } from '../../shared/api/client';
import type { StructureUnit } from './types';

export const listStructureUnits = (organisationId?: string) =>
  get<StructureUnit[]>(
    '/v1/structure-units',
    organisationId ? { organisationId: organisationId } : {},
  );
