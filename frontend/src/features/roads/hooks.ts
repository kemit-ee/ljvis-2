import { useEffect, useState } from 'react';
import type { Road } from './types';
import { listRoads } from './api';

export function useRoads() {
  const [data, setData] = useState<Road[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRoads()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { roads: data, loading };
}
