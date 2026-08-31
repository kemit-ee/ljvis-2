import { useCallback, useEffect, useRef, useState } from 'react';
import type { TransportInterruptionForm } from '../../types';
import { getTransportInterruptionForm } from '../../api';

export function useTransportInterruptionFormDetail(id: string | undefined) {
  const [form, setForm] = useState<TransportInterruptionForm | null>(null);
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
      const result = await getTransportInterruptionForm(id);
      setForm(result);
    } catch (e) {
      console.error('Failed to load transport-interruption form', e);
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
