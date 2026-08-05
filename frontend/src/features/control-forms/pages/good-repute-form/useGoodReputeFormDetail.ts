import { useCallback, useEffect, useRef, useState } from 'react';
import type { GoodReputeForm } from '../../types';
import { getGoodReputeForm } from '../../api';

export function useGoodReputeFormDetail(id: string | undefined) {
  const [form, setForm] = useState<GoodReputeForm | null>(null);
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
      const result = await getGoodReputeForm(id);
      setForm(result);
    } catch (e) {
      console.error('Failed to load good repute form', e);
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
