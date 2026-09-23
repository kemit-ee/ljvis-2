import { useCallback, useState } from 'react';
import { useEntityDetail } from '../../../../hooks/useEntityDetail';
import { getRsiMessage, sendRsiMessage } from '../../api';
import { ApiError } from '../../../../shared/api/client';
import type { RsiMessage } from '../../types';

/**
 * Loads one RSI message and exposes the send action (LJVIS2-148). Send is asynchronous
 * — a successful call only stores the ACK ('sent'); the actual result ('responded')
 * arrives later via a separate machine-only inbound-response call, so `reload()` after
 * send shows 'sent', not the final outcome. A transport failure moves the message to
 * 'error', which is terminal for RSI (unlike CGR) — there is no resend, only reload to
 * show the resulting state.
 */
export function useRsiMessageDetail(id: string | undefined) {
  const { entity, isLoading, notFound, reload } = useEntityDetail<RsiMessage>(id, getRsiMessage);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const send = useCallback(async () => {
    if (!id) return;
    setIsSending(true);
    setSendError(null);
    try {
      await sendRsiMessage(id);
    } catch (e) {
      // 422 invalid_checked_items: the draft is untouched (still 'initiated') and can be fixed.
      const code =
        e instanceof ApiError && e.status === 422
          ? (e.body as { code?: string } | null)?.code
          : undefined;
      setSendError(code === 'invalid_checked_items' ? code : 'send_failed');
      console.error('[useRsiMessageDetail] send failed', e);
    } finally {
      setIsSending(false);
      await reload();
    }
  }, [id, reload]);

  return { message: entity, isLoading, notFound, send, isSending, sendError, reload };
}
