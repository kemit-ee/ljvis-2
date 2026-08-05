import { useCallback, useEffect, useRef, useState } from 'react';
import type { TechnicalCheckForm, TechnicalCheckVariant } from '../../types';
import { getTechnicalCheckForm } from '../../api';

export function useTechnicalCheckFormDetail(
  variant: TechnicalCheckVariant,
  id: string | undefined,
) {
  const [form, setForm] = useState<TechnicalCheckForm | null>(null);
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
      const result = await getTechnicalCheckForm(variant, id);
      setForm(result);
    } catch (e) {
      console.error('Failed to load technical check form', e);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [variant, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    form,
    loading,
    refetch: fetchData,
  };
}
