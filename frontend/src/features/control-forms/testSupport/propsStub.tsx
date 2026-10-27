/* eslint-disable @typescript-eslint/no-explicit-any */
// Lasteasenduse asendaja: iga funktsioon-prop renderdatakse nupuna, mille
// klõps kutsub selle prop'i näidisargumentidega. Nii saab lehe testis
// käivitada kõik tagasikutsed ilma tegelikke vormikaarte renderdamata.
import React from 'react';
import { vi } from 'vitest';

const SAMPLE: Record<string, any[][]> = {
  onSaved: [['1', false], ['1', true]],
  onValuesChange: [[{ transportType: 'T', transportClasses: ['C'] }], [{ foo: 'bar' }]],
  onSelect: [['x']],
};

export const stubRefApi = {
  save: vi.fn(),
  validateForm: vi.fn(),
  isDirty: vi.fn(() => false),
  hasErrors: vi.fn(() => false),
  setFormData: vi.fn(),
};

export function makeStub(name: string, withRef = false) {
  const Impl = (props: Record<string, any>, ref?: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => stubRefApi);
    return (
      <div data-testid={name}>
        {Object.entries(props).flatMap(([key, value]) => {
          if (typeof value !== 'function') return [];
          const variants = SAMPLE[key] ?? [[]];
          return variants.map((args, i) => (
            <button
              key={`${key}-${i}`}
              type="button"
              data-cb={`${name}:${key}:${i}`}
              onClick={() => {
                const r = value(...args);
                if (r && typeof r.catch === 'function') r.catch(() => undefined);
              }}
            >
              {`${name}:${key}:${i}`}
            </button>
          ));
        })}
      </div>
    );
  };
  return withRef ? React.forwardRef(Impl as any) : (props: Record<string, any>) => Impl(props);
}
