/**
 * Kerged TEDI vormikomponentide asendajad komponenditestide jaoks (jsdom): päris TEDI Select/DateField
 * ei ole testis juhitav ja nende import on aeglane. Asendajad hoiavad samu props-e ja kutsuvad
 * onChange/onSelect välja sama kujuga väärtustega nagu päris komponendid.
 */
import type { ReactNode } from 'react';

interface Opt {
  value: string;
  label: string;
}

export const SelectStub = ({
  id,
  label,
  options = [],
  value,
  onChange,
  disabled,
  helper,
}: {
  id?: string;
  label?: ReactNode;
  options?: Opt[];
  value?: Opt | Opt[] | null;
  onChange?: (v: Opt | null) => void;
  disabled?: boolean;
  helper?: { text?: ReactNode };
}) => (
  <label>
    {label}
    <select
      id={id}
      data-testid={id}
      disabled={disabled}
      value={(value && !Array.isArray(value) ? value.value : '') ?? ''}
      onChange={(e) => onChange?.(options.find((o) => o.value === e.target.value) ?? null)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    {helper?.text && <span>{helper.text}</span>}
  </label>
);

export const TextFieldStub = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  disabled,
  readOnly,
  placeholder,
  helper,
}: {
  id?: string;
  label?: ReactNode;
  value?: string | number;
  onChange?: (v: string) => void;
  onBlur?: (e: unknown) => void;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  helper?: { text?: ReactNode } | undefined;
}) => (
  <label>
    <span>{label}</span>
    <input
      id={id}
      data-testid={id}
      value={value ?? ''}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
    />
    {helper?.text && <span>{helper.text}</span>}
  </label>
);

export const DateFieldStub = ({
  id,
  label,
  selected,
  onSelect,
  disabled,
}: {
  id?: string;
  label?: ReactNode;
  selected?: Date;
  onSelect?: (d: Date | undefined) => void;
  disabled?: boolean;
}) => (
  <label>
    {label}
    <input
      id={id}
      data-testid={id}
      type="text"
      disabled={disabled}
      defaultValue={selected ? selected.toISOString().slice(0, 10) : ''}
      onChange={(e) => onSelect?.(e.target.value ? new Date(e.target.value) : undefined)}
    />
  </label>
);

export const ChoiceGroupStub = ({
  id,
  items = [],
  value,
  onChange,
  inputType = 'radio',
}: {
  id?: string;
  items?: { id: string; value: string; label: ReactNode; disabled?: boolean }[];
  value?: string | string[];
  onChange?: (v: string | string[]) => void;
  inputType?: 'radio' | 'checkbox';
}) => {
  const selected = Array.isArray(value) ? value : value != null && value !== '' ? [value] : [];
  return (
    <div id={id}>
      {items.map((i) => (
        <label key={i.id}>
          <input
            type={inputType}
            data-testid={i.id}
            checked={selected.includes(i.value)}
            disabled={i.disabled}
            onChange={() =>
              onChange?.(
                inputType === 'checkbox'
                  ? selected.includes(i.value)
                    ? selected.filter((v) => v !== i.value)
                    : [...selected, i.value]
                  : i.value,
              )
            }
          />
          {i.label}
        </label>
      ))}
    </div>
  );
};

export const TextareaStub = ({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  label?: ReactNode;
  value?: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
}) => (
  <label>
    <span>{label}</span>
    <textarea id={id} data-testid={id} value={value ?? ''} disabled={disabled} onChange={(e) => onChange?.(e.target.value)} />
  </label>
);

export const TimeFieldStub = ({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  label?: ReactNode;
  value?: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
}) => (
  <label>
    <span>{label}</span>
    <input id={id} data-testid={id} value={value ?? ''} disabled={disabled} onChange={(e) => onChange?.(e.target.value)} />
  </label>
);

export const AccordionStubs = {
  Accordion: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AccordionItemHeader: ({ title }: { title?: ReactNode }) => <div>{title}</div>,
  AccordionItemContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
};

export const CheckboxStub = ({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id?: string;
  label?: ReactNode;
  checked?: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <label>
    <input
      type="checkbox"
      id={id}
      data-testid={id}
      checked={!!checked}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.checked)}
    />
    <span>{label}</span>
  </label>
);
