import { useEffect, useState } from 'react';
import type { Permission } from './types';
import { listPermissions } from './api';

export function usePermissions() {
  const [data, setData] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPermissions()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { permissions: data, loading };
}
