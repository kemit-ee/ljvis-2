import { useCallback, useEffect, useRef, useState } from 'react';
import type { TramControlCard } from '../../types';
import { getTramForm } from '../../api';

export function useTramControlCardDetail(id: string | undefined) {
  const [form, setForm] = useState<TramControlCard | null>(null);
  const [loading, setLoading] = useState(true);
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
      const result = await getTramForm(Number(id));
      setForm((result as TramControlCard | null) ?? null);
    } catch (e) {
      console.error('Failed to load TRAM control card', e);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { form, loading, refetch: fetchData };
}
