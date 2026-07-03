import { post } from '../../shared/api/client';
import type { StructureUnit } from './types';

export const listStructureUnits = () =>
  post<StructureUnit[]>('/v1/structure-units/list', {});
