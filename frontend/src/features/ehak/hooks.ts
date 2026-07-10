import { useEffect, useState } from 'react';
import type { Ehak } from './types';
import { listEhakCounties } from './api';

export function useCounties() {
  const [data, setData] = useState<Ehak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEhakCounties()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { counties: data, loading };
}
