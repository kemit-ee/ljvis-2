import type { StatusBadgeColor } from '@tedi-design-system/react/tedi';

/**
 * Colour of a request/message lifecycle status, shared by every ERRU family (CTUD, CGR, RSI,
 * NCR, NU) so the same status looks the same in lists and detail headers:
 *  - draft (initiated)                              → neutral
 *  - outgoing, waiting for the answer (sending, sent, uncertain send) → warning (yellow)
 *  - incoming, in progress (received, viewed, drafted answer)         → brand (blue)
 *  - answered / handled                             → success (green)
 *  - error                                          → danger
 */
export function erruStatusColor(status: string | null | undefined): StatusBadgeColor {
  switch (status) {
    case 'sending':
    case 'sent':
    case 'send_unknown':
      return 'warning';
    case 'received':
    case 'viewed':
    case 'answer_drafted':
      return 'brand';
    case 'responded':
    case 'answered':
    case 'acknowledged':
    case 'forwarded':
      return 'success';
    case 'error':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Colour of a single member-state response outcome (CTUD/CGR Found, NotFound, Timeout, NotAvailable; RSI OK, NotFound). */
export function erruResponseColor(code: string | null | undefined): StatusBadgeColor {
  switch (code) {
    case 'Found':
    case 'OK':
      return 'success';
    case 'NotFound':
      return 'warning';
    case 'Timeout':
    case 'NotAvailable':
      return 'danger';
    default:
      return 'neutral';
  }
}
