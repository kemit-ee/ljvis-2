import { useCallback, useState } from 'react';
import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import type { ListParams } from '../../../../hooks/usePaginatedList';
import { listCgrRequests } from '../../api';
import type { CgrListFilters, CgrRequestListItem } from '../../types';

/**
 * CGR request list (LJVIS2-140). Filters are held separately from the paginated-list
 * state because the specification requires that editing a filter does NOT refresh the
 * list — it refreshes only when "Otsi" is pressed, and then returns to the first page.
 * Mirrors useCtudList.ts.
 */
export function useCgrList() {
  // what the user is editing
  const [draftFilters, setDraftFilters] = useState<CgrListFilters>({});
  // what is actually applied to the query
  const [appliedFilters, setAppliedFilters] = useState<CgrListFilters>({});

  const fetchFn = useCallback(
    (params: ListParams) => listCgrRequests(params, appliedFilters),
    [appliedFilters],
  );

  const list = usePaginatedList<CgrRequestListItem>(fetchFn, {
    defaultSort: 'sent_at desc',
  });

  const setFilter = useCallback((key: keyof CgrListFilters, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
    list.setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [draftFilters, list]);

  const resetFilters = useCallback(() => {
    setDraftFilters({});
    setAppliedFilters({});
    list.setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [list]);

  return { ...list, draftFilters, setFilter, applyFilters, resetFilters };
}
