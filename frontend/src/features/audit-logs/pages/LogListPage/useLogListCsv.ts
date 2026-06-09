import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { exportLogs } from '../../api';
import type { ListApiParams } from '../../../../hooks/usePaginatedList';
import type { AuditLog } from '../../types';
import { formatDateTime } from '../../../../hooks/dateUtils';
import { decodeHtmlEntities } from '../../../../hooks/stringUtils';

function generateExportFilename(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `audit_log_export_${day}${month}${year}_${hours}${minutes}${seconds}.csv`;
}

function formatLogRow(log: AuditLog): string[] {
  const actorName = log.actorName || '';
  const actorPersonalCode = log.actorPersonalCode || '';
  
  let person = '';
  if (actorName && actorPersonalCode) {
    person = `${actorName} (${actorPersonalCode})`;
  } else if (actorPersonalCode) {
    person = actorPersonalCode;
  } else if (actorName) {
    person = actorName;
  } else {
    person = '-';
  }

  const decodedLogContent = decodeHtmlEntities(log.logContent || '');

  return [
    log.createdAt ? formatDateTime(log.createdAt) : '',
    person,
    log.eventCategory || '',
    log.eventType || '',
    log.description || '',
    decodedLogContent
  ];
}

export function useLogListCsv() {
  const { t } = useTranslation();

  const exportCsv = useCallback(async (params: ListApiParams) => {
    try {
      const result = await exportLogs(params);
      const logs = result.content;

      const headers = [
        t('logs.date'),
        t('logs.person'),
        t('logs.eventCategory'),
        t('logs.eventType'),
        t('logs.description'),
        t('logs.content')
      ];

      const rows = logs.map(formatLogRow);

      const csvContent = [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              // Escape quotes and wrap in quotes if contains semicolon or quote
              const cellStr = String(cell);
              if (cellStr.includes(';') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(';'),
        )
        .join('\n');

      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

      const filename = generateExportFilename();

      // Download file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error('CSV export failed', e);
    }
  }, [t]);

  return { exportCsv };
}
