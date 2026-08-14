import { useFilteredList } from '../../../../hooks/useFilteredList';
import { listNcrCases } from '../../api';
import type { NcrCaseListItem, NcrListFilters } from '../../types';

/**
 * NCR case list (LJVIS2-65). Filters are held separately from the paginated-list state
 * because the spec requires that editing a filter does NOT refresh the list — it
 * refreshes only when "Otsi" is pressed, and then returns to the first page. Mirrors
 * useRsiList.ts / useCgrList.ts / useCtudList.ts.
 */
export function useNcrList() {
  return useFilteredList<NcrCaseListItem, NcrListFilters>(listNcrCases, {
    defaultSort: 'sent_at desc',
  });
}
