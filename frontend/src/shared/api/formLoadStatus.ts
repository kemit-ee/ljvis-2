import { getLastLoadFailure } from './client';

const RECENT_MS = 60_000;

/** Status of the form read that just failed, or null when it is not a recent form request. */
export function recentFormLoadStatus(now: number = Date.now()): number | null {
  const failure = getLastLoadFailure();
  if (!failure || now - failure.at > RECENT_MS) return null;
  return failure.path.includes('/control-forms') ? failure.status : null;
}
