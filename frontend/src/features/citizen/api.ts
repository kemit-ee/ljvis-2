import { get, post } from '../../shared/api/client';
import type { PagedResponse, ListParams } from '../../hooks/usePaginatedList';
import type {
  CompoundForm,
  ForeignViolationForm,
  GoodReputeForm,
  LabourInspectionForm,
} from '../control-forms/types';
import type {
  CitizenFormRow,
  CompanyControlsBreakdown,
  CompanyRiskScore,
} from './types';

interface CitizenFormsSearchScope {
  scope?: 'self' | 'company';
  registryCode?: string;
}

async function searchCitizenFormsScoped(
  params: ListParams,
  scope: CitizenFormsSearchScope = {},
): Promise<PagedResponse<CitizenFormRow>> {
  const rows = await post<CitizenFormRow[]>('/v1/citizen/forms/search', {
    scope: scope.scope || '',
    registry_code: scope.registryCode || '',
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

// Legacy behaviour: POST/v1/citizen/forms/search.yml determines the scope
// from the session's activeRole claim server-side (no explicit `scope`
// sent) — kept for backward compatibility with any existing callers.
export function searchCitizenForms(
  params: ListParams,
): Promise<PagedResponse<CitizenFormRow>> {
  return searchCitizenFormsScoped(params);
}

// "Minu protokollid" section: always the session's own forms
// (driver/punished person/good-repute subject), independent of activeRole —
// so it can be shown alongside "Minu ettevõtted" rather than requiring a
// role switch.
export function searchMyProtocols(
  params: ListParams,
): Promise<PagedResponse<CitizenFormRow>> {
  return searchCitizenFormsScoped(params, { scope: 'self' });
}

// "Minu ettevõtted" section: one specific represented company's
// forms, independent of activeRole/activeRegistryCode — the dashboard lists
// every represented company at once, it can't rely on "the" active company.
// registryCode is re-verified server-side against the session's
// representedCompanies (or a live Äriregister call) on every request.
export function searchCompanyForms(
  registryCode: string,
): (params: ListParams) => Promise<PagedResponse<CitizenFormRow>> {
  return (params: ListParams) =>
    searchCitizenFormsScoped(params, { scope: 'company', registryCode });
}

// GET/v1/citizen/risk-scores/my-company.yml — same representative check as
// forms/search's scope=company branch.
export function getCompanyRiskScore(
  registryCode: string,
): Promise<CompanyRiskScore> {
  return get<CompanyRiskScore>('/v1/citizen/risk-scores/my-company', {
    q: registryCode,
  });
}

// GET/v1/citizen/risk-scores/controls.yml — per-control MSI/VSI/SI/MI
// severity breakdown + weightedPoints, backing CompanyControlsTable.
export function getCompanyControlsBreakdown(
  registryCode: string,
): Promise<CompanyControlsBreakdown> {
  return get<CompanyControlsBreakdown>('/v1/citizen/risk-scores/controls', {
    q: registryCode,
  });
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
