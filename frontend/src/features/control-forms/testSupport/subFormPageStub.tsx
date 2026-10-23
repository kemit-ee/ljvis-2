/* eslint-disable @typescript-eslint/no-explicit-any */
// Koondvormi loomislehe alamvormi lehtede asendaja: väljastab ref-API, mida leht
// kasutab (getFormData/setFormData/hasErrors/validateForm/handleSubmit).
import React from 'react';
import { vi } from 'vitest';

export const subState = {
  refMode: 'full' as 'full' | 'noSubmit' | 'none',
  hasErrors: false,
  submitSaves: true,
  getFormDataUndefined: false,
};
export const subRefs: Record<string, { setFormData: ReturnType<typeof vi.fn>; validateForm: ReturnType<typeof vi.fn>; handleSubmit: ReturnType<typeof vi.fn> }> = {};

export function makeSubPageStub(label: string) {
  return React.forwardRef<unknown, any>(function SubPageStub(props, ref) {
    const name = props.type ? `${label}-${props.type}${props.trailerIndex != null ? `-${props.trailerIndex}` : ''}` : label;
    const propsRef = React.useRef(props);
    propsRef.current = props;
    const api = React.useMemo(() => {
      const entry = subRefs[name] ?? (subRefs[name] = { setFormData: vi.fn(), validateForm: vi.fn(), handleSubmit: vi.fn() });
      entry.handleSubmit.mockImplementation((id?: number) => {
        if (subState.submitSaves) propsRef.current.onSaved?.(id != null ? `sub-${name}` : undefined);
      });
      return entry;
    }, [name]);
    React.useImperativeHandle(
      ref,
      () => {
        if (subState.refMode === 'none') return null as never;
        const base: any = {
          setFormData: api.setFormData,
          validateForm: api.validateForm,
          hasErrors: () => subState.hasErrors,
          getFormData: () => (subState.getFormDataUndefined ? undefined : { from: name }),
        };
        if (subState.refMode === 'full') base.handleSubmit = api.handleSubmit;
        return base;
      },
      [api],
    );
    return (
      <div data-testid={name}>
        <button type="button" data-cb={`${name}:onValuesChange:a`} onClick={() => props.onValuesChange?.({ transportType: 'T', transportClasses: ['C'] })}>
          vc-a
        </button>
        <button type="button" data-cb={`${name}:onValuesChange:b`} onClick={() => props.onValuesChange?.({ other: 1 })}>
          vc-b
        </button>
        <button type="button" data-cb={`${name}:onSaved:id`} onClick={() => props.onSaved?.('77')}>
          saved-id
        </button>
        <button type="button" data-cb={`${name}:onSaved:none`} onClick={() => props.onSaved?.()}>
          saved-none
        </button>
      </div>
    );
  });
}
