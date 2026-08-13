import { useCallback, useState } from 'react';
import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import type { ListParams } from '../../../../hooks/usePaginatedList';
import { listRsiMessages } from '../../api';
import type { RsiListFilters, RsiMessageListItem } from '../../types';

/**
 * RSI message list (LJVIS2-149). Filters are held separately from the paginated-list
 * state because the specification requires that editing a filter does NOT refresh the
 * list — it refreshes only when "Otsi" is pressed, and then returns to the first page.
 * Mirrors useCgrList.ts / useCtudList.ts.
 */
export function useRsiList() {
  const [draftFilters, setDraftFilters] = useState<RsiListFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<RsiListFilters>({});

  const fetchFn = useCallback(
    (params: ListParams) => listRsiMessages(params, appliedFilters),
    [appliedFilters],
  );

  const list = usePaginatedList<RsiMessageListItem>(fetchFn, {
    defaultSort: 'sent_at desc',
  });

  const setFilter = useCallback((key: keyof RsiListFilters, value: string) => {
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
