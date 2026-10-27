import type { ReactNode } from 'react';
import { Icon } from '@tedi-design-system/react/tedi';

/**
 * Direction of an ERRU request/message in lists: an arrow icon in front of the text, so
 * incoming (arrow into the system) and outgoing (arrow out) can be told apart at a glance.
 * The text stays, so colour/icon is never the only carrier of the meaning.
 */
export function ErruDirection({ direction, children }: { direction: string | null | undefined; children: ReactNode }) {
  const outgoing = direction === 'outgoing';
  return (
    <span className="erru-direction">
      <Icon name={outgoing ? 'call_made' : 'call_received'} size={18} color="secondary" />
      <span>{children}</span>
    </span>
  );
}
