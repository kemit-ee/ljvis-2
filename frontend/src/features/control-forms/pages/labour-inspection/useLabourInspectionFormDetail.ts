import { useCallback, useEffect, useRef, useState } from 'react';
import type { LabourInspectionForm } from '../../types';
import { getLabourInspectionForm } from '../../api';

export function useLabourInspectionFormDetail(id: string | undefined) {
  const [form, setForm] = useState<LabourInspectionForm | null>(null);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const result = await getLabourInspectionForm(Number(id));
      setForm(result);
    } catch (e) {
      console.error('Failed to load labour inspection form', e);
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
