import { get } from '../../shared/api/client';
import type { DashboardScope, DashboardSummary } from './types';

export function fetchDashboardSummary(
  scope: DashboardScope = 'own',
): Promise<DashboardSummary> {
  return get<DashboardSummary>('/v1/dashboard/summary', { scope });
}
