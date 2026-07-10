import { useEffect, useState } from 'react';
import type { TrailerCategory } from './types';
import { listTrailerCategories } from './api';

export function useTrailerCategories() {
  const [data, setData] = useState<TrailerCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTrailerCategories()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { trailerCategories: data, loading };
}
