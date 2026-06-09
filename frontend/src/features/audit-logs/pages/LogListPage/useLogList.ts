import { usePaginatedList } from '../../../../hooks/usePaginatedList.ts';
import { listLogs } from '../../api.ts';
import type { AuditLog } from '../../types.ts';
import { decodeHtmlEntities } from '../../../../hooks/stringUtils';

function transformLogs(logs: AuditLog[]): AuditLog[] {
  return logs.map((log) => ({
    ...log,
    description: decodeHtmlEntities(log.description),
  }));
}

export function useLogList() {
  return usePaginatedList(listLogs, {
    defaultSort: 'createdAt desc',
    transform: transformLogs,
  });
}
