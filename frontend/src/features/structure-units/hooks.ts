import { useEffect, useState } from 'react';
import type { StructureUnit } from './types';
import { listStructureUnits } from './api';

export function useStructureUnits() {
  const [data, setData] = useState<StructureUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listStructureUnits()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { structureUnits: data, loading };
}
