import { useCallback, useEffect, useState } from 'react';
import { getRsiMessage } from '../../api';
import type { RsiMessage } from '../../types';

/** Loads one RSI message. Send/eeltäitmine (LJVIS2-148) are not wired yet — vorm stage only. */
export function useRsiMessageDetail(id: string | undefined) {
  const [message, setMessage] = useState<RsiMessage | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setNotFound(false);
    try {
      setMessage(await getRsiMessage(id));
    } catch (e) {
      console.error('[useRsiMessageDetail] load failed', e);
      setNotFound(true);
      setMessage(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { message, isLoading, notFound, reload: load };
}
