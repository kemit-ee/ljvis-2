import type { ReactNode } from 'react';
import { Text } from '@tedi-design-system/react/tedi';

/**
 * Label/value row of a read-only detail view. Declared at module level (not inside a
 * render function) so React keeps its identity between renders.
 */
export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <Text modifiers="bold">{label}</Text>
      <Text>{value === null || value === undefined || value === '' ? '—' : value}</Text>
    </div>
  );
}
