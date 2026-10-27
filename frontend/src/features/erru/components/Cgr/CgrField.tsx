import type { ReactNode } from 'react';
import { Text } from '@tedi-design-system/react/tedi';

/** Label above value for the read-only CGR views; empty values render as '—'. */
export function CgrField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="cgr-field">
      <Text modifiers="bold">{label}</Text>
      <Text>{value === null || value === undefined || value === '' ? '—' : value}</Text>
    </div>
  );
}
