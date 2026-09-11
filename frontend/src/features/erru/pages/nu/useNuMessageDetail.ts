import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { nuErrorMessage } from '../../nuErrors';
import { useEntityDetail } from '../../../../hooks/useEntityDetail';
import { getNuMessage, sendNuMessage } from '../../api';
import type { NuMessage } from '../../types';

// Reload after sending to display the persisted status.
export function useNuMessageDetail(
  id: string | undefined,
  snapshotId?: string,
) {
  const { t } = useTranslation();
  const fetchMessage = useCallback(
    (key: string) => getNuMessage(key, snapshotId),
    [snapshotId],
  );
  const { entity, isLoading, notFound, reload } = useEntityDetail<NuMessage>(
    id,
    fetchMessage,
  );
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const send = useCallback(async () => {
    if (!id || !entity || snapshotId || isSending) return;
    setIsSending(true);
    setSendError(null);
    try {
      await sendNuMessage(id, entity.version);
    } catch (e) {
      setSendError(nuErrorMessage(e, t, 'erru.nu.validation.send_failed'));
      console.error('[useNuMessageDetail] send failed', e);
    } finally {
      setIsSending(false);
      await reload();
    }
  }, [id, entity, snapshotId, isSending, reload, t]);

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
