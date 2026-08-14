import { useFilteredList } from '../../../../hooks/useFilteredList';
import { listRsiMessages } from '../../api';
import type { RsiListFilters, RsiMessageListItem } from '../../types';

/**
 * RSI message list (LJVIS2-149). Filters are held separately from the paginated-list
 * state because the specification requires that editing a filter does NOT refresh the
 * list — it refreshes only when "Otsi" is pressed, and then returns to the first page.
 * Mirrors useCgrList.ts / useCtudList.ts.
 */
export function useRsiList() {
  return useFilteredList<RsiMessageListItem, RsiListFilters>(listRsiMessages, {
    defaultSort: 'sent_at desc',
  });
}
