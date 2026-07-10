import {get, post} from '../../shared/api/client';
import type { Ehak } from './types';

export const listEhakCounties = () =>
    get<Ehak[]>('/v1/ehak/counties');

export const listEhakCitiesParishes = (parentId?: number) =>
    post<Ehak[]>('/v1/ehak/list', parentId ? { parentId: Number(parentId) } : {});