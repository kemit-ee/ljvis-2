import { TimeField } from '@tedi-design-system/react/tedi';
import type { TimeFieldProps } from '@tedi-design-system/react/tedi';
import { maskTimeInput } from '../../../../hooks/dateUtils';

/**
 * TEDI `TimeField` with as-you-type colon insertion: typing `1200` turns into
 * `12:00` while the user types, instead of only on blur. The masked string is
 * passed to the supplied `onChange`; callers stay responsible for their own
 * form-state conversion.
 */
export function MaskedTimeField({ onChange, ...rest }: TimeFieldProps) {
  return (
    <TimeField
      {...rest}
      onChange={(value) => onChange?.(maskTimeInput(value))}
    />
  );
}
