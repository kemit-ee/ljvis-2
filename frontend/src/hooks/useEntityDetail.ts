import { useCallback, useEffect, useState } from 'react';

/**
 * Generic load-by-id hook for a single entity's detail view: tracks isLoading/notFound
 * and exposes reload(). Extracted from the near-identical useCgrRequestDetail /
 * useCtudRequestDetail / useRsiMessageDetail / useNcrCase — action hooks (e.g. "send")
 * should be layered on top rather than duplicated per entity.
 */
export function useEntityDetail<T>(id: string | undefined, fetchFn: (id: string) => Promise<T>) {
  const [entity, setEntity] = useState<T | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setNotFound(false);
    try {
      setEntity(await fetchFn(id));
    } catch (e) {
      console.error('[useEntityDetail] load failed', e);
      setNotFound(true);
      setEntity(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchFn]);

  useEffect(() => {
    load();
  }, [load]);

  return { entity, isLoading, notFound, reload: load };
}
