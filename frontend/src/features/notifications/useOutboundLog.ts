import { useFilteredList } from '../../hooks/useFilteredList';
import { fetchOutboundLog } from './api';
import type { OutboundLogEntry, OutboundLogFilters } from './types';

/**
 * UC-02 Postkast 2.0 saadetud kirjade logi — server-poolne leheküljestamine +
 * filtrid (status / notificationType / dateFrom-dateTo / recipient / notificationKey).
 * Filtrid rakenduvad alles "Otsi" vajutusel (useFilteredList). Sortimine on manuaalne
 * (kõik veerud peale "Tegevused") — vaikimisi send_date DESC.
 */
export function useOutboundLog() {
  return useFilteredList<OutboundLogEntry, OutboundLogFilters>(fetchOutboundLog, {
    defaultSort: 'send_date desc',
  });
}
