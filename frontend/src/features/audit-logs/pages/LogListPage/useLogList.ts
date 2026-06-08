import { usePaginatedList } from '../../../../hooks/usePaginatedList.ts';
import { listLogs } from '../../api.ts';

export function useLogList() {
  return usePaginatedList(listLogs, { defaultSort: 'createdAt desc' });
}
