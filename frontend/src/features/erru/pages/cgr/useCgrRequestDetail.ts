import { useEntityDetail } from '../../../../hooks/useEntityDetail';
import { getCgrRequest } from '../../api';
import type { CgrRequest } from '../../types';

/** Loads one CGR request. Send (LJVIS2-139) is not wired yet — vorm stage only. */
export function useCgrRequestDetail(id: string | undefined) {
  const { entity, isLoading, notFound, reload } = useEntityDetail<CgrRequest>(id, getCgrRequest);
  return { request: entity, isLoading, notFound, reload };
}
