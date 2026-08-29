import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import { searchCitizenForms } from '../../api';
import type { CitizenFormRow } from '../../types';

export function useCompanyFormsList() {
  return usePaginatedList<CitizenFormRow>(searchCitizenForms, {
    defaultSort: 'main_date desc',
  });
}
