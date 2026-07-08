import { useCallback, useEffect, useState } from 'react';
import type { ClassifierValue } from '../../types.ts';
import { getClassifierValue } from '../../api.ts';

export function useClassifierValueDetail(valueId: string | undefined) {
  const [value, setValue] = useState<ClassifierValue | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!valueId) return;
    setLoading(true);
    try {
      const result = await getClassifierValue(valueId);
      setValue(result.content[0] ?? null);
    } catch (e) {
      console.error('Failed to load classifier value', e);
    } finally {
      setLoading(false);
    }
  }, [valueId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { value, loading, refetch: fetchData };
}
