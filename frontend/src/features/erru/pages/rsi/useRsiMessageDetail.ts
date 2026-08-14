import { useEntityDetail } from '../../../../hooks/useEntityDetail';
import { getRsiMessage } from '../../api';
import type { RsiMessage } from '../../types';

/** Loads one RSI message. Send/eeltäitmine (LJVIS2-148) are not wired yet — vorm stage only. */
export function useRsiMessageDetail(id: string | undefined) {
  const { entity, isLoading, notFound, reload } = useEntityDetail<RsiMessage>(id, getRsiMessage);
  return { message: entity, isLoading, notFound, reload };
}
