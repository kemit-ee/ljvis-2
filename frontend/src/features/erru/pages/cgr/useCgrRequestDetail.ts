import { useCallback, useState } from 'react';
import { useEntityDetail } from '../../../../hooks/useEntityDetail';
import { getCgrRequest, resendCgrRequest, sendCgrRequest } from '../../api';
import { ApiError } from '../../../../shared/api/client';
import type { CgrRequest } from '../../types';

/** Codes the send/resend endpoints return; anything else is a plain send_failed. */
const SEND_ERROR_CODES = ['send_unknown', 'invalid_cgr_xml', 'validation_unavailable', 'nysiis_unavailable'];

function sendErrorCode(e: unknown): string {
  const code = e instanceof ApiError ? (e.body as { code?: string } | null)?.code : undefined;
  return code && SEND_ERROR_CODES.includes(code) ? code : 'send_failed';
}

/**
 * Loads one CGR request and exposes the send/resend actions (LJVIS2-139).
 *
 * Sending is asynchronous: when send()/resend() resolve the Hub has only accepted the XML
 * ('sent'). The member-state answers arrive later and are visible after a reload. A rejection
 * leaves the request retryable (send) or unaffected (resend, per-country); an uncertain
 * outcome (send_unknown) must not be retried. The record is reloaded either way.
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
      setSendError(sendErrorCode(e));
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
        setSendError(sendErrorCode(e));
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
