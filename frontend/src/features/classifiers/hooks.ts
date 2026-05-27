import { useCallback, useEffect, useState } from 'react';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import type { Classifier } from './types.ts';
import { listClassifiers } from './api.ts';

// ---------------------------------------------------------------------------
// Helper: convert to snake case
// ---------------------------------------------------------------------------
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// ---------------------------------------------------------------------------
// Data hook: classifier list with search
// ---------------------------------------------------------------------------
export function useClassifierList() {
  const [data, setData] = useState<Classifier[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<SortingState>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const sortStr = sorting.length
        ? `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`
        : 'code asc';
      const result = await listClassifiers({
        search,
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        sorting: sortStr,
      });

      setData(result);
      // Use backend total count if available
      if (result.length > 0 && result[0].total != null) {
        setTotalRows(result[0].total);
      } else {
        setTotalRows(result.length);
      }
    } catch (e) {
      console.error('Failed to load classifiers', e);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, pagination, sorting]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (value: string) => {
    if (value.length >= 3 || value.length === 0) {
      setSearch(value);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }
  };
  const clearSearch = () => { setSearchInput(''); setSearch(''); setPagination((p) => ({ ...p, pageIndex: 0 })); };

  return {
    data,
    totalRows,
    isLoading,
    pagination,
    setPagination,
    sorting,
    setSorting,
    searchInput,
    setSearchInput,
    handleSearch,
    clearSearch,
    refetch: fetchData,
  };
}
