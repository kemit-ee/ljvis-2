import { get } from '../../shared/api/client';
import type { TrailerCategory } from './types';

export const listTrailerCategories = () =>
  get<TrailerCategory[]>('/v1/trailer-categories');
