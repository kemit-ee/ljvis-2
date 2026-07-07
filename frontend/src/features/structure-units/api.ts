import { get } from '../../shared/api/client';
import type { StructureUnit } from './types';

export const listStructureUnits = () =>
  get<StructureUnit[]>('/v1/structure-units');
