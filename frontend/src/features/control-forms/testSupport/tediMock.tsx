/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
// Kerged TEDI asendajad testidele: natiivsed elemendid, mille sündmused
// kutsuvad TEDI-lik tagasikutseid (Select annab kätte valiku objekti).
import React from 'react';

type P = Record<string, any>;

const Passthrough = ({ children, className, id }: P) => (
  <div className={className} id={id}>
    {children}
  </div>
);

const Button = ({ children, onClick, disabled, type, id, isLoading }: P) => (
  <button
    type={type ?? 'button'}
    id={id}
    onClick={onClick}
    disabled={disabled}
    data-loading={isLoading ? 'true' : undefined}
  >
    {children}
  </button>
);

const Heading = ({ children, element: El = 'h2' }: P) => React.createElement(El, null, children);
const Text = ({ children }: P) => <span>{children}</span>;

const Alert = ({ children, onClose, type }: P) => (
  <div role="alert" data-type={type}>
    {children}
    {onClose && (
      <button type="button" aria-label="alert-close" onClick={onClose}>
        x
      </button>
    )}
  </div>
);

const helperText = (helper: P | undefined) =>
  helper?.text ? <span data-testid="helper">{helper.text}</span> : null;

const TextField = ({ id, label, value, onChange, disabled, helper, input }: P) => (
  <label>
    {label}
    <input
      id={id}
      value={value ?? ''}
      disabled={disabled}
      maxLength={input?.maxLength}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={input?.onBlur}
    />
    {helperText(helper)}
  </label>
);

const Textarea = ({ id, label, value, onChange, disabled, helper }: P) => (
  <label>
    {label}
    <textarea
      id={id}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
    />
    {helperText(helper)}
  </label>
);

const Select = ({ id, label, options = [], value, onChange, disabled, helper, multiple }: P) => (
  <label>
    {label}
    <select
      id={id}
      disabled={disabled}
      value={value?.value ?? ''}
      onChange={(e) => {
        const opt = options.find((o: P) => String(o.value) === e.target.value);
        onChange?.(opt ?? null);
      }}
      data-multiple={multiple ? 'true' : undefined}
    >
      <option value="" />
      {options.map((o: P) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
    {helperText(helper)}
  </label>
);

const DateField = ({ id, label, onSelect, onChange, disabled, helper, selected, inputProps }: P) => (
  <label>
    {label}
    <input
      id={id}
      data-kind="date"
      disabled={disabled}
      defaultValue={selected instanceof Date ? selected.toISOString().slice(0, 10) : ''}
      onChange={(e) => {
        const v = e.target.value ? new Date(e.target.value) : undefined;
        onSelect?.(v);
        onChange?.(v);
      }}
    />
    {helperText(helper ?? inputProps?.helper)}
  </label>
);

const TimeField = ({ id, label, value, onChange, disabled, helper, inputProps }: P) => (
  <label>
    {label}
    <input
      id={id}
      data-kind="time"
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
    />
    {helperText(helper ?? inputProps?.helper)}
  </label>
);

const ChoiceGroup = ({ id, label, items = [], value, onChange, inputType, disabled, helper }: P) => (
  <fieldset id={id}>
    <legend>{label}</legend>
    {items.map((item: P) => {
      const checked = Array.isArray(value) ? value.includes(item.value) : value === item.value;
      return (
        <label key={item.id ?? item.value}>
          <input
            type={inputType === 'radio' ? 'radio' : 'checkbox'}
            id={item.id}
            checked={checked}
            disabled={disabled}
            onChange={() => {
              if (inputType === 'radio') onChange?.(item.value);
              else {
                const cur: any[] = Array.isArray(value) ? value : [];
                onChange?.(checked ? cur.filter((v) => v !== item.value) : [...cur, item.value]);
              }
            }}
          />
          {item.label}
        </label>
      );
    })}
    {helperText(helper)}
  </fieldset>
);

const Checkbox = ({ id, label, checked, onChange, disabled, value }: P) => (
  <label>
    <input
      type="checkbox"
      id={id}
      checked={!!checked}
      disabled={disabled}
      onChange={(e) => onChange?.(value ?? e.target.checked, e.target.checked)}
    />
    {label}
  </label>
);

const Card: any = ({ children, className }: P) => <section className={className}>{children}</section>;
Card.Content = Passthrough;
Card.Header = Passthrough;

const Dropdown: any = ({ children }: P) => <div>{children}</div>;
Dropdown.Trigger = ({ children }: P) => <div>{children}</div>;
Dropdown.Content = ({ children }: P) => <div>{children}</div>;
Dropdown.Item = ({ children, onClick }: P) => (
  <button type="button" onClick={onClick}>
    {children}
  </button>
);

const TabsCtx = React.createContext<{ current?: string; onChange?: (id: string) => void }>({});
const Tabs: any = ({ children, defaultValue, value, onChange }: P) => (
  <TabsCtx.Provider value={{ current: value ?? defaultValue, onChange }}>
    <div>{children}</div>
  </TabsCtx.Provider>
);
Tabs.List = Passthrough;
const TabsTrigger = ({ id, children }: P) => {
  const ctx = React.useContext(TabsCtx);
  return (
    <button type="button" role="tab" data-tab={id} onClick={() => ctx.onChange?.(id)}>
      {children}
    </button>
  );
};
Tabs.Trigger = TabsTrigger;
Tabs.Content = ({ id, children }: P) => <div data-tabcontent={id}>{children}</div>;

const Tooltip: any = ({ children }: P) => <>{children}</>;
Tooltip.Trigger = ({ children }: P) => <>{children}</>;
Tooltip.Content = ({ children }: P) => <span>{children}</span>;

const InfoButton = ({ children }: P) => <span>{children}</span>;
const ClosingButton = ({ onClick }: P) => (
  <button type="button" aria-label="closing" onClick={onClick}>
    x
  </button>
);
const StatusIndicator = ({ text }: P) => <span>{text}</span>;
const Row = Passthrough;
const Col = Passthrough;

export const tediMock = {
  Alert,
  Button,
  Card,
  Checkbox,
  ChoiceGroup,
  ClosingButton,
  Col,
  DateField,
  Dropdown,
  Heading,
  InfoButton,
  Row,
  Select,
  StatusIndicator,
  Tabs,
  Text,
  TextField,
  Textarea,
  TimeField,
  Tooltip,
};
