import { useCallback, useEffect, useState, useRef } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { CompoundForm } from '../../types';
import { getCompoundForm } from '../../api';

const toDateValue = (date?: string): Dayjs | null =>
  date ? dayjs(date) : null;

const toTimeValue = (date?: string, time?: string): Dayjs | null => {
  if (!time) return null;
  if (date && time) return dayjs(`${date}T${time}`);
  return dayjs(`1970-01-01T${time}`);
};

export function useCompoundFormDetail(id: string | undefined, subFormId?: number) {
  const [form, setForm] = useState<CompoundForm | null>(null);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const result = await getCompoundForm(Number(id), subFormId);
      setForm(result);
    } catch (e) {
      console.error('Failed to load compound form', e);
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
    toDateValue,
    toTimeValue,
    refetch: fetchData,
  };
}
