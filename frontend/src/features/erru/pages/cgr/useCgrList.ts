import { useFilteredList } from '../../../../hooks/useFilteredList';
import { listCgrRequests } from '../../api';
import type { CgrListFilters, CgrRequestListItem } from '../../types';

/**
 * CGR request list (LJVIS2-140). Filters are held separately from the paginated-list
 * state because the specification requires that editing a filter does NOT refresh the
 * list — it refreshes only when "Otsi" is pressed, and then returns to the first page.
 * Mirrors useCtudList.ts.
 */
export function useCgrList() {
  return useFilteredList<CgrRequestListItem, CgrListFilters>(listCgrRequests, {
    defaultSort: 'sent_at desc',
  });
}
