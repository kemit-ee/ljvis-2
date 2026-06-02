import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import { listClassifiers } from '../../api';

export function useClassifierList() {
  return usePaginatedList(listClassifiers, { defaultSort: 'code asc' });
}
