import { useCallback, useEffect, useState, useRef } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { ForeignViolationForm } from '../../types';
import { getForm } from '../../api';

const toDateValue = (date?: string): Dayjs | null =>
  date ? dayjs(date) : null;

const toTimeValue = (date?: string, time?: string): Dayjs | null => {
  if (!time) return null;
  if (date && time) return dayjs(`${date}T${time}`);
  return dayjs(`1970-01-01T${time}`);
};

export function useFormDetail(id: string | undefined) {
  const [form, setForm] = useState<ForeignViolationForm | null>(null);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const result = await getForm(Number(id));
      setForm(result ?? null);
    } catch (e) {
      console.error('Failed to load form', e);
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
  };
}
