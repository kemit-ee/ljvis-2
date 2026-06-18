import { useCallback, useEffect, useState, useRef } from 'react';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { buildSortString, useSearchHandler } from './stringUtils';

export interface ListParams {
  page: string;
  pageSize: string;
  search: string;
  sorting: string;
}

export type ListApiParams = Partial<ListParams> & {
  logSearch?: boolean;
};

export interface PagedResponse<T> {
  content: T[];
  total: number;
}

export interface UsePaginatedListOptions<T, R = T> {
  defaultSort?: string;
  transform?: (items: T[]) => R[];
}

export function usePaginatedList<T, R = T>(
  fetchFn: (params: ListParams) => Promise<PagedResponse<T>>,
  options: UsePaginatedListOptions<T, R> = {},
) {
  const { defaultSort = 'name asc', transform } = options;

  const [data, setData] = useState<R[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
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
      const result = await fetchFn({
        page: String(pagination.pageIndex + 1),
        pageSize: String(pagination.pageSize),
        search,
        sorting: buildSortString(sorting, defaultSort),
      });

      setData(transform ? transform(result.content) : (result.content as unknown as R[]));
      setTotalRows(result.total);
    } catch (e) {
      console.error('[usePaginatedList] fetch failed', e);
      setData([]);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [fetchFn, pagination, sorting, search, defaultSort, transform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useSearchHandler(setSearch, setPagination);

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

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
