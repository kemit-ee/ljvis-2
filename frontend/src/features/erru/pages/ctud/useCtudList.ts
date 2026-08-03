import { useCallback, useState } from 'react';
import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import type { ListParams } from '../../../../hooks/usePaginatedList';
import { listCtudRequests } from '../../api';
import type { CtudListFilters, CtudRequestListItem } from '../../types';

/**
 * CTUD request list. Filters are held separately from the paginated-list state because
 * the specification requires that editing a filter does NOT refresh the list — it
 * refreshes only when "Otsi" is pressed, and then returns to the first page.
 */
export function useCtudList() {
  // what the user is editing
  const [draftFilters, setDraftFilters] = useState<CtudListFilters>({});
  // what is actually applied to the query
  const [appliedFilters, setAppliedFilters] = useState<CtudListFilters>({});

  const fetchFn = useCallback(
    (params: ListParams) => listCtudRequests(params, appliedFilters),
    [appliedFilters],
  );

  const list = usePaginatedList<CtudRequestListItem>(fetchFn, {
    defaultSort: 'sent_at desc',
  });

  const setFilter = useCallback((key: keyof CtudListFilters, value: string) => {
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
