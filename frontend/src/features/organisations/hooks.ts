import { useEffect, useState } from 'react';
import type { Organisation } from './types';
import { listOrganisations } from './api';

export function useOrganisations() {
  const [data, setData] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOrganisations()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { organisations: data, loading };
}
