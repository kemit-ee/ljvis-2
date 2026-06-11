import { useCallback, useEffect, useState, useRef } from 'react';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { Classifier, ClassifierValue } from '../../types';
import { getClassifier, getClassifierValues } from '../../api';
import { toSnakeCase } from '../../../../hooks/stringUtils';

export function useClassifierDetail(id: string | undefined) {
  const [classifier, setClassifier] = useState<Classifier | null>(null);
  const [classifierValues, setClassifierValues] = useState<ClassifierValue[]>([]);
  const [classifierValueSearch, setClassifierValueSearch] = useState('');
  const [classifierValueSearchInput, setClassifierValueSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const [classifiers, values] = await Promise.all([
        getClassifier(id),
        getClassifierValues({
          classifierId: id,
          search: classifierValueSearch,
          page: String(pagination.pageIndex + 1),
          pageSize: String(pagination.pageSize),
          sorting:
            sorting.length > 0
              ? `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`
              : 'isValid desc',
        }),
      ]);
      setClassifier(classifiers[0] ?? null);
      setClassifierValues(values);
    } catch (e) {
      console.error('Failed to load classifier', e);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [id, classifierValueSearch, pagination, sorting]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClassifierValueSearch = (value: string) => {
    if (value.length >= 3 || value.length === 0) {
      setClassifierValueSearch(value);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }
  };

  const clearClassifierValueSearch = () => {
    setClassifierValueSearchInput('');
    setClassifierValueSearch('');
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  return {
    classifier,
    classifierValues,
    loading,
    refetch: fetchData,
    classifierValueSearchInput,
    setClassifierValueSearchInput,
    handleClassifierValueSearch,
    clearClassifierValueSearch,
    pagination,
    setPagination,
    sorting,
    setSorting,
  };
}
