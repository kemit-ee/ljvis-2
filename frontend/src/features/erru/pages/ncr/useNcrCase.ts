import { useEntityDetail } from '../../../../hooks/useEntityDetail';
import { getNcrCase } from '../../api';
import type { NcrCase } from '../../types';

/**
 * Loads the full snapshot history of one NCR case (LJVIS2-63). The last element of
 * `snapshots` is the current state; the whole array backs the read-only
 * "Juhtumi teadete loend". A GET on an incoming 'received' case auto-transitions it to
 * 'viewed' server-side (LJVIS2-62 §4) — reload() picks up the resulting state.
 */
export function useNcrCase(businessCaseId: string | undefined) {
  const { entity, isLoading, notFound, reload } = useEntityDetail<NcrCase>(businessCaseId, getNcrCase);
  const snapshots = entity?.snapshots ?? [];
  const current = snapshots.length > 0 ? snapshots[snapshots.length - 1] : undefined;

  return { snapshots, current, isLoading, notFound, reload };
}
