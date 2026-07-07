import { useEffect, useState } from 'react';
import type { Country } from './types';
import { listCountries } from './api';

export function useCountries() {
  const [data, setData] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCountries()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { countries: data, loading };
}
