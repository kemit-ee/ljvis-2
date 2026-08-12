import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { buildSortString } from '../../../../hooks/stringUtils';
import { searchForms } from '../../api';
import type { FormSearchRow, FormSearchFilters } from '../../types';

const EMPTY_FILTERS: FormSearchFilters = {
  dateFrom: '',
  dateTo: '',
  formType: '',
  vehicleRegNr: '',
  companyRegCode: '',
  companyName: '',
  driver: '',
  county: '',
  hasViolation: '',
  status: '',
};

const DEFAULT_SORT = 'main_date desc';

/**
 * LJVIS2-9 form search state. Mirrors usePaginatedList but supports a structured
 * multi-field filter panel with explicit apply: `draft` holds the in-progress
 * filter values, `applied` is what the query actually uses. "Otsi" copies draft
 * → applied and resets to page 1 (LJVIS2-65 behaviour). Changing a filter does
 * NOT refetch until applied.
 */
export function useFormSearch() {
  const [draft, setDraft] = useState<FormSearchFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<FormSearchFilters>(EMPTY_FILTERS);
  const [data, setData] = useState<FormSearchRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const isFetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setIsLoading(true);
    try {
      const result = await searchForms({
        ...applied,
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        sorting: buildSortString(sorting, DEFAULT_SORT),
      } as Record<string, string>);
      setData(result.content);
      setTotalRows(result.total);
    } catch (e) {
      console.error('[useFormSearch] fetch failed', e);
      setData([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [applied, pagination, sorting]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setField = useCallback(
    (key: keyof FormSearchFilters, value: string) =>
      setDraft((d) => ({ ...d, [key]: value })),
    [],
  );

  const applyFilters = useCallback(() => {
    setApplied(draft);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [draft]);

  const clearFilters = useCallback(() => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  return {
    draft,
    setField,
    applyFilters,
    clearFilters,
    data,
    totalRows,
    isLoading,
    pagination,
    setPagination,
    sorting,
    setSorting,
  };
}
