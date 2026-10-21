import { useCallback, useState } from 'react';
import { useEntityDetail } from '../../../../hooks/useEntityDetail';
import { getCtudRequest, sendCtudRequest } from '../../api';
import { ApiError } from '../../../../shared/api/client';
import type { CtudRequest } from '../../types';

/** Codes the send endpoint returns; anything else is a plain send_failed. */
const SEND_ERROR_CODES = ['send_unknown', 'invalid_ctud_xml', 'validation_unavailable'];

export function sendErrorCode(e: unknown): string {
  const code = e instanceof ApiError ? (e.body as { code?: string } | null)?.code : undefined;
  return code && SEND_ERROR_CODES.includes(code) ? code : 'send_failed';
}

/** Loads one CTUD request and exposes the send action. */
export function useCtudRequestDetail(id: string | undefined) {
  const { entity, isLoading, notFound, reload } = useEntityDetail<CtudRequest>(id, getCtudRequest);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  /**
   * Sending is asynchronous: when this resolves the Hub has only accepted the XML ('sent');
   * the country's answer arrives later and is visible after a reload. A rejection leaves the
   * request retryable; an uncertain outcome (send_unknown) must not be retried. The record is
   * reloaded either way to show the resulting status.
   */
  const send = useCallback(async () => {
    if (!id) return;
    setIsSending(true);
    setSendError(null);
    try {
      await sendCtudRequest(id);
    } catch (e) {
      setSendError(sendErrorCode(e));
      console.error('[useCtudRequestDetail] send failed', e);
    } finally {
      setIsSending(false);
      await reload();
    }
  }, [id, reload]);

  return { request: entity, isLoading, notFound, send, isSending, sendError, reload };
}
