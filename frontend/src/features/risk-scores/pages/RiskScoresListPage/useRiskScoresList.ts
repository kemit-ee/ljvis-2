import { useFilteredList } from '../../../../hooks/useFilteredList';
import { listRiskScores } from '../../api';
import type { RiskScoreListItem, RiskScoreListFilters } from '../../types';

/**
 * Riskitasemete loend (LJVIS2-152). Filters (regCode/riskBand) are held
 * separately from the paginated-list state and only take effect on "Otsi"
 * — mirrors useNcrList.ts / useCtudList.ts. The free-text company-name
 * search field uses the paginated list's own built-in `search` (bound to
 * `q`), same as every other admin list in this codebase.
 */
export function useRiskScoresList() {
  return useFilteredList<RiskScoreListItem, RiskScoreListFilters>(listRiskScores, {
    // Must match toSnakeCase('companyName') ('company_name'), NOT the bare
    // 'name' used by some other list pages — list_risk_scores.sql's ORDER BY
    // whitelist keys off the exact column accessor names in this table.
    defaultSort: 'company_name asc',
  });
}
