import { useCallback, useState } from 'react';
import { useEntityDetail } from '../../../../hooks/useEntityDetail';
import { getCgrRequest, resendCgrRequest, sendCgrRequest } from '../../api';
import type { CgrRequest } from '../../types';

/**
 * Loads one CGR request and exposes the send/resend actions (LJVIS2-139).
 *
 * Sending is synchronous, so the stored state (memberStates, status) is final by the
 * time send()/resend() resolve. A transport failure surfaces as an error but leaves the
 * request retryable (send) or unaffected (resend, per-country), so the record is
 * reloaded either way to show the resulting state.
 */
export function useCgrRequestDetail(id: string | undefined) {
  const { entity, isLoading, notFound, reload } = useEntityDetail<CgrRequest>(id, getCgrRequest);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [resendingCountry, setResendingCountry] = useState<string | null>(null);

  const send = useCallback(async () => {
    if (!id) return;
    setIsSending(true);
    setSendError(null);
    try {
      await sendCgrRequest(id);
    } catch (e) {
      setSendError('send_failed');
      console.error('[useCgrRequestDetail] send failed', e);
    } finally {
      setIsSending(false);
      await reload();
    }
  }, [id, reload]);

  const resend = useCallback(
    async (memberStateCode: string) => {
      if (!id) return;
      setResendingCountry(memberStateCode);
      setSendError(null);
      try {
        await resendCgrRequest(id, memberStateCode);
      } catch (e) {
        setSendError('send_failed');
        console.error('[useCgrRequestDetail] resend failed', e);
      } finally {
        setResendingCountry(null);
        await reload();
      }
    },
    [id, reload],
  );

  return {
    request: entity,
    isLoading,
    notFound,
    send,
    isSending,
    resend,
    resendingCountry,
    sendError,
    reload,
  };
}
