import { get } from '../../shared/api/client';
import type { Road } from './types';

export const listRoads = () => get<Road[]>('/v1/roads');
