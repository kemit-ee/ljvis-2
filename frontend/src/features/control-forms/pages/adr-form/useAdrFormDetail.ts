import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdrForm } from '../../types';
import { getAdrForm } from '../../api';

export function useAdrFormDetail(id: string | undefined) {
  const [form, setForm] = useState<AdrForm | null>(null);
  const [loading, setLoading] = useState(!!id);
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const result = await getAdrForm(id);
      setForm(result);
    } catch (e) {
      console.error('Failed to load ADR form', e);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    form,
    loading,
    refetch: fetchData,
  };
}
