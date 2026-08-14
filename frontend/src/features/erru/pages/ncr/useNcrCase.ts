import { useCallback, useEffect, useState } from 'react';
import { getNcrCase } from '../../api';
import type { NcrMessage } from '../../types';

/**
 * Loads the full snapshot history of one NCR case (LJVIS2-63). The last element of
 * `snapshots` is the current state; the whole array backs the read-only
 * "Juhtumi teadete loend". A GET on an incoming 'received' case auto-transitions it to
 * 'viewed' server-side (LJVIS2-62 §4) — reload() picks up the resulting state.
 */
export function useNcrCase(businessCaseId: string | undefined) {
  const [snapshots, setSnapshots] = useState<NcrMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!businessCaseId) return;
    setIsLoading(true);
    setNotFound(false);
    try {
      const res = await getNcrCase(businessCaseId);
      setSnapshots(res.snapshots ?? []);
    } catch (e) {
      console.error('[useNcrCase] load failed', e);
      setNotFound(true);
      setSnapshots([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessCaseId]);

  useEffect(() => {
    load();
  }, [load]);

  const current = snapshots.length > 0 ? snapshots[snapshots.length - 1] : undefined;

  return { snapshots, current, isLoading, notFound, reload: load };
}
