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
}: {
  id?: string;
  label?: ReactNode;
  options?: Opt[];
  value?: Opt | Opt[] | null;
  onChange?: (v: Opt | null) => void;
  disabled?: boolean;
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
}: {
  id?: string;
  items?: { id: string; value: string; label: ReactNode; disabled?: boolean }[];
  value?: string;
  onChange?: (v: string) => void;
}) => (
  <div id={id}>
    {items.map((i) => (
      <label key={i.id}>
        <input
          type="radio"
          data-testid={i.id}
          checked={value === i.value}
          disabled={i.disabled}
          onChange={() => onChange?.(i.value)}
        />
        {i.label}
      </label>
    ))}
  </div>
);
