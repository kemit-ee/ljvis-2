import { get, post } from '../../shared/api/client';
import type { PagedResponse, ListParams } from '../../hooks/usePaginatedList';
import type {
  CompoundForm,
  ForeignViolationForm,
  GoodReputeForm,
  LabourInspectionForm,
} from '../control-forms/types';
import type { CitizenFormRow } from './types';

// POST/v1/citizen/forms/search.yml determines the company from the session's
// activeRegistryCode claim server-side — the client never sends a
// company_reg_code, it can only ever see its own active company's forms.
export async function searchCitizenForms(
  params: ListParams,
): Promise<PagedResponse<CitizenFormRow>> {
  const rows = await post<CitizenFormRow[]>('/v1/citizen/forms/search', {
    page: params.page,
    page_size: params.pageSize,
    sorting: params.sorting,
    form_type: '',
  });
  return {
    content: rows,
    total: rows.length > 0 ? Number(rows[0].total ?? 0) : 0,
  };
}

// GET/v1/citizen/forms/labour-inspection.yml determines ownership from the
// session's activeRegistryCode/personalCode server-side, same trust boundary
// as searchCitizenForms — a citizen can only ever fetch their own forms.
export function getCitizenLabourInspectionForm(
  id: number,
): Promise<LabourInspectionForm> {
  return get<LabourInspectionForm>('/v1/citizen/forms/labour-inspection', {
    q: String(id),
  });
}

export function getCitizenCompoundForm(id: number): Promise<CompoundForm> {
  return get<CompoundForm>('/v1/citizen/forms/compound', {
    q: String(id),
  });
}

export function getCitizenForeignViolationForm(
  id: number,
): Promise<ForeignViolationForm> {
  return get<ForeignViolationForm>('/v1/citizen/forms/foreign-violation', {
    q: String(id),
  });
}

export function getCitizenGoodReputeForm(
  id: number,
): Promise<GoodReputeForm> {
  return get<GoodReputeForm>('/v1/citizen/forms/good-repute', {
    q: String(id),
  });
}
