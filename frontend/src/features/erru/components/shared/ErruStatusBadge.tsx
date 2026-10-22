import type { ReactNode } from 'react';
import { StatusBadge } from '@tedi-design-system/react/tedi';
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

/**
 * Lifecycle status as a coloured badge. In lists the single-country response outcome can be
 * shown under it as a second, bordered badge, so the cell stays two short lines instead of a
 * wrapped "Vastus saadud / Sihtriik ei vastanud õigeaegselt" sentence.
 */
export function ErruStatusBadge({
  status,
  children,
  response,
}: {
  status: string | null | undefined;
  children: ReactNode;
  response?: { code: string | null | undefined; label: ReactNode } | null;
}) {
  return (
    <div className="erru-status">
      <StatusBadge color={erruStatusColor(status)}>{children}</StatusBadge>
      {response?.code && (
        <StatusBadge color={erruResponseColor(response.code)} variant="bordered">
          {response.label}
        </StatusBadge>
      )}
    </div>
  );
}
