/* eslint-disable no-restricted-imports -- see on ainus koht, kus TEDI TextField'i otse kasutatakse */
import { forwardRef } from 'react';
import {
  TextField as TediTextField,
  type TextFieldForwardRef,
  type TextFieldProps,
} from '@tedi-design-system/react/tedi';
import { SINGLE_LINE_MAX_LENGTH } from '../textLimits';

/** TEDI TextField, millel on alati pikkuspiirang. */
export const TextField = forwardRef<TextFieldForwardRef, TextFieldProps>(
  function TextField({ input, ...props }, ref) {
    return (
      <TediTextField
        {...props}
        ref={ref}
        input={{ maxLength: SINGLE_LINE_MAX_LENGTH, ...input }}
      />
    );
  },
);
