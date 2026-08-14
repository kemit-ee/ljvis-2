import { useCallback, useState } from 'react';
import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import type { ListParams } from '../../../../hooks/usePaginatedList';
import { listNcrCases } from '../../api';
import type { NcrCaseListItem, NcrListFilters } from '../../types';

/**
 * NCR case list (LJVIS2-65). Filters are held separately from the paginated-list state
 * because the spec requires that editing a filter does NOT refresh the list — it
 * refreshes only when "Otsi" is pressed, and then returns to the first page. Mirrors
 * useRsiList.ts / useCgrList.ts / useCtudList.ts.
 */
export function useNcrList() {
  const [draftFilters, setDraftFilters] = useState<NcrListFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<NcrListFilters>({});

  const fetchFn = useCallback(
    (params: ListParams) => listNcrCases(params, appliedFilters),
    [appliedFilters],
  );

  const list = usePaginatedList<NcrCaseListItem>(fetchFn, {
    defaultSort: 'sent_at desc',
  });

  const setFilter = useCallback((key: keyof NcrListFilters, value: string) => {
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
