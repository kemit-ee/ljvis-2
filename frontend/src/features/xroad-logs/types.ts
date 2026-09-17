// Väljanimed on camelCase — Rust Resql tagastab kõik veerud camelCase kujul
// (ka selgelt snake_case aliasitud veerud), sama nagu mujal rakenduses.

export type XroadLogResultStatus = 'found' | 'not_found' | 'error';

export interface XroadLogEntry {
  id: string;
  serviceCode: string | null;
  requestXml: string | null;
  responseXml: string | null;
  durationMs: number | null;
  success: boolean | null;
  errorMessage: string | null;
  resultStatus: XroadLogResultStatus | null;
  personIdentifier: string | null;
  sourceType: string | null;
  sourceRecordId: string | null;
  createdAt: string | null;
  total?: number;
}

export interface XroadLogFilters {
  dateFrom?: string;
  dateTo?: string;
  /** Kolm sõltumatut checkbox-lippu 'true'/'false' kujul (vt useFilteredList setFilter). */
  includeFound?: string;
  includeNotFound?: string;
  includeError?: string;
}
