import { useCallback, useEffect, useState } from 'react';
import { getCgrRequest } from '../../api';
import type { CgrRequest } from '../../types';

/** Loads one CGR request. Send (LJVIS2-139) is not wired yet — vorm stage only. */
export function useCgrRequestDetail(id: string | undefined) {
  const [request, setRequest] = useState<CgrRequest | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setNotFound(false);
    try {
      setRequest(await getCgrRequest(id));
    } catch (e) {
      console.error('[useCgrRequestDetail] load failed', e);
      setNotFound(true);
      setRequest(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { request, isLoading, notFound, reload: load };
}
