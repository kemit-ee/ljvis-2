import { get } from '../../shared/api/client';
import type { ListParams, PagedResponse } from '../../hooks/usePaginatedList';
import type { RiskScoreListItem, RiskScoreListFilters } from './types';

export function listRiskScores(
  params: ListParams,
  filters: RiskScoreListFilters = {},
): Promise<PagedResponse<RiskScoreListItem>> {
  const query: Record<string, string> = {
    page: params.page,
    pageSize: params.pageSize,
    sorting: params.sorting,
  };
  if (filters.companyName) query.q = filters.companyName;
  if (filters.regCode) query.regCode = filters.regCode;
  if (filters.riskBand) query.riskBand = filters.riskBand;
  return get<PagedResponse<RiskScoreListItem>>('/v1/admin/risk-scores/list', query);
}
