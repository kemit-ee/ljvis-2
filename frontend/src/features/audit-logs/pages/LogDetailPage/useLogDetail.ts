import { useCallback, useEffect, useState } from 'react';
import type { AuditLog } from '../../types';
import { getLog } from '../../api';
import { decodeHtmlEntities } from '../../../../hooks/stringUtils';

export function useLogDetail(id: string | undefined) {
  const [auditLog, setAuditLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [logs] = await Promise.all([getLog(id)]);
      setAuditLog(logs[0] ?? null);
    } catch (e) {
      console.error('Failed to load classifier', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const actorName = auditLog?.actorName || '';

  const person = actorName || '-';

  const decodedLogContent = decodeHtmlEntities(auditLog?.logContent || '');

  let cleanedLogContent = decodedLogContent;
  if (cleanedLogContent.startsWith('[') && cleanedLogContent.endsWith(']')) {
    cleanedLogContent = cleanedLogContent.slice(1, -1);
  }

  return {
    auditLog,
    loading,
    person,
    decodedLogContent: cleanedLogContent,
  };
}
