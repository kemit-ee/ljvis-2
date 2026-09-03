import { useFilteredList } from '../../hooks/useFilteredList';
import { fetchOutboundLog } from './api';
import type { OutboundLogEntry, OutboundLogFilters } from './types';

/**
 * UC-02 Postkast 2.0 saadetud kirjade logi — server-poolne leheküljestamine +
 * filtrid (status / messageType / dateFrom). Filtrid rakenduvad alles "Otsi"
 * vajutusel (useFilteredList). Sort on serveris fikseeritud (send_date DESC),
 * seega veergudel sortimist ei lubata.
 */
export function useOutboundLog() {
  return useFilteredList<OutboundLogEntry, OutboundLogFilters>(fetchOutboundLog, {
    defaultSort: 'send_date desc',
  });
}
