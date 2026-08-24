import { useCallback, useState } from 'react';
import { useEntityDetail } from '../../../../hooks/useEntityDetail';
import { getCtudRequest, sendCtudRequest } from '../../api';
import type { CtudRequest } from '../../types';

/** Loads one CTUD request and exposes the send action. */
export function useCtudRequestDetail(id: string | undefined) {
  const { entity, isLoading, notFound, reload } = useEntityDetail<CtudRequest>(id, getCtudRequest);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

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
      await reload();
    }
  }, [id, reload]);

  return { request: entity, isLoading, notFound, send, isSending, sendError, reload };
}
