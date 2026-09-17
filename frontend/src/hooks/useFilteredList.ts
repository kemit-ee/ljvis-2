import { useCallback, useState } from 'react';
import { usePaginatedList } from './usePaginatedList';
import type { ListParams, PagedResponse } from './usePaginatedList';

export interface UseFilteredListOptions<TFilters = object> {
  defaultSort?: string;
  defaultFilters?: TFilters;
}

/**
 * Generic list-with-filters hook. Filters are held separately from the paginated-list
 * state because several list screens require that editing a filter does NOT refresh
 * the list — it refreshes only when "Otsi" is pressed, and then returns to the first
 * page. Extracted from the near-identical useCgrList/useCtudList/useRsiList/useNcrList.
 *
 * `resetKey` increments on every `resetFilters` call — use it as a React `key` on
 * components with internal state that doesn't sync when the controlled prop becomes
 * undefined (e.g. TEDI DateField).
 */
export function useFilteredList<TItem, TFilters extends object>(
  listFn: (params: ListParams, filters: TFilters) => Promise<PagedResponse<TItem>>,
  options: UseFilteredListOptions<TFilters> = {},
) {
  const initialFilters = options.defaultFilters ?? ({} as TFilters);
  // what the user is editing
  const [draftFilters, setDraftFilters] = useState<TFilters>(initialFilters);
  // what is actually applied to the query
  const [appliedFilters, setAppliedFilters] = useState<TFilters>(initialFilters);
  const [resetKey, setResetKey] = useState(0);

  const fetchFn = useCallback(
    (params: ListParams) => listFn(params, appliedFilters),
    [listFn, appliedFilters],
  );

  const list = usePaginatedList<TItem>(fetchFn, { defaultSort: options.defaultSort });

  const setFilter = useCallback((key: keyof TFilters, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
    list.setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [draftFilters, list]);

  const resetFilters = useCallback(() => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
    list.setPagination((p) => ({ ...p, pageIndex: 0 }));
    setResetKey((k) => k + 1);
  }, [list, initialFilters]);

  return { ...list, draftFilters, setFilter, applyFilters, resetFilters, resetKey };
}
