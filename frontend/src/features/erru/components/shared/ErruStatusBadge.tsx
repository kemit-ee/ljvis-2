import type { ReactNode } from 'react';
import { StatusBadge } from '@tedi-design-system/react/tedi';
import { erruResponseColor, erruStatusColor } from '../../utils/erruStatusColors';

/** Lifecycle status as a coloured badge (one per row, never wraps). */
export function ErruStatusBadge({ status, children }: { status: string | null | undefined; children: ReactNode }) {
  return <StatusBadge color={erruStatusColor(status)}>{children}</StatusBadge>;
}

/**
 * Single-country response outcome (Found, NotFound, Timeout, NotAvailable, OK) as its own
 * badge, shown in a separate "Tulemus" column next to the status. Empty when the request has
 * no single-country outcome (broadcast or not answered yet).
 */
export function ErruResultBadge({ code, children }: { code: string | null | undefined; children: ReactNode }) {
  if (!code) return <>—</>;
  return <StatusBadge color={erruResponseColor(code)}>{children}</StatusBadge>;
}
