import { useCallback, useState } from 'react';
import { useEntityDetail } from '../../../../hooks/useEntityDetail';
import { getRsiMessage, sendRsiMessage } from '../../api';
import { nuErrorDetails } from '../../nuErrors';
import type { RsiMessage } from '../../types';

/**
 * Loads one RSI message and exposes the send action (LJVIS2-148). Send is asynchronous
 * — a successful call only stores the ACK ('sent'); the actual result ('responded')
 * arrives later through the XML adapter. A rejection becomes 'error'; an uncertain
 * transport result becomes 'send_unknown'. Neither state permits an automatic resend.
 */
export function useRsiMessageDetail(id: string | undefined) {
  const { entity, isLoading, notFound, reload } = useEntityDetail<RsiMessage>(
    id,
    getRsiMessage,
  );
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const send = useCallback(async () => {
    if (!id) return;
    setIsSending(true);
    setSendError(null);
    try {
      await sendRsiMessage(id);
    } catch (e) {
      // Validation failures leave the draft editable. Unknown transport results forbid resend.
      const { code } = nuErrorDetails(e);
      setSendError(
        code === 'invalid_checked_items' ||
          code === 'send_unknown' ||
          code === 'invalid_rsi_xml'
          ? code
          : 'send_failed',
      );
      console.error('[useRsiMessageDetail] send failed', e);
    } finally {
      setIsSending(false);
      await reload();
    }
  }, [id, reload]);

  return {
    message: entity,
    isLoading,
    notFound,
    send,
    isSending,
    sendError,
    reload,
  };
}
