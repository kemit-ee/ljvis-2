import { useFilteredList } from '../../hooks/useFilteredList';
import { toIsoDate } from '../../hooks/dateUtils';
import { fetchXroadLogList } from './api';
import type { XroadLogEntry, XroadLogFilters } from './types';

function yesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

/** Vaikefilter: eile — täna, kõik kolm staatust märgitud (kirjeldus real lehel avanedes). */
const DEFAULT_FILTERS: XroadLogFilters = {
  dateFrom: toIsoDate(yesterday()),
  dateTo: toIsoDate(new Date()),
  includeFound: 'true',
  includeNotFound: 'true',
  includeError: 'true',
  allServices: 'false',
};

export function useXroadLogList() {
  return useFilteredList<XroadLogEntry, XroadLogFilters>(fetchXroadLogList, {
    defaultSort: 'created_at desc',
    defaultFilters: DEFAULT_FILTERS,
  });
}
