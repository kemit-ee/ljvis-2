import { useEffect, useState } from 'react';
import type { VehicleCategory } from './types';
import { listVehicleCategories } from './api';

export function useTrailerCategories() {
  const [data, setData] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listVehicleCategories()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { vehicleCategories: data, loading };
}
