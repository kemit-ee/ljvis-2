import { get } from '../../shared/api/client';
import type { VehicleCategory } from './types';

export const listVehicleCategories = () =>
    get<VehicleCategory[]>('/v1/vehicle-categories');