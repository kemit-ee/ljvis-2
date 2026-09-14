import { useFilteredList } from '../../../../hooks/useFilteredList';
import { listNuMessages } from '../../api';
import type { NuListFilters, NuMessageListItem } from '../../types';

export function useNuList() {
  return useFilteredList<NuMessageListItem, NuListFilters>(listNuMessages, {
    defaultSort: 'message_date desc',
  });
}
