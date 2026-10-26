import type { ReactNode } from 'react';
import { vi } from 'vitest';

type Opt = { value: string; label: string };
type Anyprops = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const helperText = (p: Anyprops) => (p.helper?.text ? <span role="note">{p.helper.text}</span> : null);
const inputHelper = (p: Anyprops) => helperText(p.inputProps ?? {});

/**
 * Light-weight stand-ins for the TEDI form controls so a test can drive every onChange /
 * onSelect callback of an ERRU form with plain DOM events (labels map to accessible names).
 */
export async function tediMock() {
  const actual = await vi.importActual<Record<string, unknown>>('@tedi-design-system/react/tedi');

  const TextField = (p: Anyprops) => (
    <label>
      {p.label}
      <input
        id={p.id}
        value={p.value ?? ''}
        disabled={p.disabled}
        onChange={(e) => p.onChange?.(e.target.value)}
        onBlur={p.onBlur}
      />
      {helperText(p)}
    </label>
  );

  const Select = (p: Anyprops) => {
    const options: Opt[] = p.options ?? [];
    return (
      <label>
        {p.label}
        <select
          id={p.id}
          value={p.value?.value ?? ''}
          disabled={p.disabled}
          onChange={(e) => p.onChange?.(options.find((o) => o.value === e.target.value) ?? null)}
        >
          <option value="" />
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {helperText(p)}
      </label>
    );
  };

  const DateField = (p: Anyprops) => (
    <label>
      {p.label}
      <input
        type="date"
        id={p.id}
        onChange={(e) => p.onSelect?.(e.target.value ? new Date(e.target.value) : undefined)}
      />
      {inputHelper(p)}
    </label>
  );

  const ChoiceGroup = (p: Anyprops) => {
    const multi = p.inputType === 'checkbox';
    const selectedValues: string[] = multi ? (p.value ?? []) : [];
    return (
      <fieldset>
        <legend>{p.label}</legend>
        {(p.items ?? []).map((i: Anyprops) => (
          <label key={i.id}>
            {i.label}
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={p.name}
              id={i.id}
              value={i.value}
              checked={multi ? selectedValues.includes(i.value) : p.value === i.value}
              onChange={() =>
                p.onChange?.(
                  multi
                    ? selectedValues.includes(i.value)
                      ? selectedValues.filter((v) => v !== i.value)
                      : [...selectedValues, i.value]
                    : i.value,
                )
              }
            />
          </label>
        ))}
        {helperText(p)}
      </fieldset>
    );
  };

  const Checkbox = (p: Anyprops) => (
    <label>
      {p.label}
      <input
        type="checkbox"
        id={p.id}
        checked={!!p.checked}
        disabled={p.disabled}
        onChange={(e) => p.onChange?.(p.value, e.target.checked)}
      />
    </label>
  );

  const Radio = (p: Anyprops) => (
    <label>
      {p.label}
      <input type="radio" name={p.name} id={p.id} value={p.value} checked={!!p.checked} onChange={() => p.onChange?.(p.value)} />
    </label>
  );

  const Modal = Object.assign(({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div role="dialog">{children}</div> : null), {
    Content: ({ children }: { children: ReactNode }) => <>{children}</>,
    Header: ({ title }: { title: string }) => <h2>{title}</h2>,
    Body: ({ children }: { children: ReactNode }) => <>{children}</>,
    Footer: ({ children }: { children: ReactNode }) => <>{children}</>,
  });

  return { ...actual, TextField, Select, DateField, ChoiceGroup, Checkbox, Radio, Modal };
}

/** Replacement for the control-forms MaskedDateField / MaskedTimeField wrappers. */
export function maskedFieldMock() {
  const Masked = (p: Anyprops) => (
    <label>
      {p.label}
      <input
        type="date"
        id={p.id}
        onChange={(e) => {
          p.inputProps?.onChangeEvent?.(e);
          if (!e.target.value) p.inputProps?.onClear?.();
          (p.onSelect ?? p.onChange)?.(e.target.value ? new Date(e.target.value) : undefined);
        }}
      />
      {inputHelper(p)}
    </label>
  );
  return { MaskedDateField: Masked, MaskedTimeField: Masked };
}
