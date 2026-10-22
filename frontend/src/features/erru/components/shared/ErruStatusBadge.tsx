import type { ReactNode } from 'react';
import { StatusBadge } from '@tedi-design-system/react/tedi';
import { erruResponseColor, erruStatusColor } from '../../utils/erruStatusColors';

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
