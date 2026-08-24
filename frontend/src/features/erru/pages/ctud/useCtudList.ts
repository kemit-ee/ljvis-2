import { useFilteredList } from '../../../../hooks/useFilteredList';
import { listCtudRequests } from '../../api';
import type { CtudListFilters, CtudRequestListItem } from '../../types';

/**
 * CTUD request list. Filters are held separately from the paginated-list state because
 * the specification requires that editing a filter does NOT refresh the list — it
 * refreshes only when "Otsi" is pressed, and then returns to the first page.
 */
export function useCtudList() {
  return useFilteredList<CtudRequestListItem, CtudListFilters>(listCtudRequests, {
    defaultSort: 'sent_at desc',
  });
}
