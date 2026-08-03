import { useCallback, useEffect, useState } from 'react';
import { getCtudRequest, sendCtudRequest } from '../../api';
import type { CtudRequest } from '../../types';

/** Loads one CTUD request and exposes the send action. */
export function useCtudRequestDetail(id: string | undefined) {
  const [request, setRequest] = useState<CtudRequest | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setNotFound(false);
    try {
      setRequest(await getCtudRequest(id));
    } catch (e) {
      console.error('[useCtudRequestDetail] load failed', e);
      setNotFound(true);
      setRequest(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Sending is synchronous, so the stored state is final by the time this resolves.
   * A transport failure surfaces as an error but leaves the request retryable, so the
   * record is reloaded either way to show the resulting status.
   */
  const send = useCallback(async () => {
    if (!id) return;
    setIsSending(true);
    setSendError(null);
    try {
      await sendCtudRequest(id);
    } catch (e) {
      setSendError('send_failed');
      console.error('[useCtudRequestDetail] send failed', e);
    } finally {
      setIsSending(false);
      await load();
    }
  }, [id, load]);

  return { request, isLoading, notFound, send, isSending, sendError, reload: load };
}
