import { useCallback, useEffect, useState } from 'react';
import { listNotificationTemplateMappings } from '../../api';
import type { NotificationTemplateMapping } from '../../types';

export function useNotificationTemplateMappingDetail(
  notificationType: string | undefined,
) {
  const [mapping, setMapping] = useState<NotificationTemplateMapping | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!notificationType) return;
    setLoading(true);
    try {
      const all = await listNotificationTemplateMappings();
      setMapping(
        all.find((m) => m.notificationType === notificationType) ?? null,
      );
    } catch (e) {
      console.error('Failed to load notification template mapping', e);
    } finally {
      setLoading(false);
    }
  }, [notificationType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { mapping, loading, refetch: fetchData };
}
