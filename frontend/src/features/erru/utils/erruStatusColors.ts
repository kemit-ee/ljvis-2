import type { StatusBadgeColor } from '@tedi-design-system/react/tedi';

/**
 * Colour of a request/message lifecycle status, shared by every ERRU family (CTUD, CGR, RSI,
 * NCR, NU) so the same status looks the same in lists and detail headers. Follows the TEDI
 * "Status badge" guidance (tedi.ee → Components → Tags → Status badge):
 *  - neutral: draft, nothing to report (initiated)
 *  - brand (blue): informative, no action expected — in progress / being handled
 *    (sending, sent, viewed)
 *  - accent (orange): waiting for the user's attention (received)
 *  - warning: needs a reaction, unfinished (answer_drafted, send_unknown)
 *  - success: positively completed (responded, answered, acknowledged, forwarded)
 *  - danger: failure (error)
 */
export function erruStatusColor(status: string | null | undefined): StatusBadgeColor {
  switch (status) {
    case 'sending':
    case 'sent':
    case 'viewed':
      return 'brand';
    case 'received':
      return 'accent';
    case 'answer_drafted':
    case 'send_unknown':
      return 'warning';
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
    case 'Timeout':
    case 'NotAvailable':
      return 'danger';
    default:
      return 'neutral';
  }
}
