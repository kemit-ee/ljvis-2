import { useCallback, useEffect, useState } from 'react';
import type { ClassifierValue } from '../../types.ts';
import { getClassifierValue } from '../../api.ts';

export function useClassifierValueDetail(
  classifierId: string | undefined,
  valueId: string | undefined,
) {
  const [value, setValue] = useState<ClassifierValue | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!classifierId || !valueId) return;
    setLoading(true);
    try {
      setValue((await getClassifierValue(classifierId, valueId)) ?? null);
    } catch (e) {
      console.error('Failed to load classifier value', e);
    } finally {
      setLoading(false);
    }
  }, [classifierId, valueId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { value, loading, refetch: fetchData };
}
