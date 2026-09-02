import { useEffect, useMemo, useRef } from 'react';
import { DateField } from '@tedi-design-system/react/tedi';
import type {
  DateFieldProps,
  TextFieldForwardRef,
} from '@tedi-design-system/react/tedi';
import { completeDateOnBlur, maskDateInput } from '../../../../hooks/dateUtils';

/** Sets an input's value through the native setter so React's change tracking
 *  still fires when we dispatch a synthetic `input` event. */
function setNativeValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(el, value);
}

/**
 * TEDI `DateField` for manually typed control dates:
 *
 * - As-you-type separator insertion — `31032026` becomes `31.03.2026` while
 *   typing, so manual entry no longer trips the "Vigane kuupäev" error. TEDI
 *   exposes no per-keystroke string callback, so we listen on the real
 *   `<input>` (reached via the forwarded ref) and rewrite its value before
 *   TEDI's own `onChange` reads it.
 * - Shorthand years on blur — `1209` is completed to `12.09.<this year>`,
 *   `031225` to `03.12.2025`. The completed text is replayed as an `input`
 *   event so TEDI parses and commits it like a fully typed date.
 * - `selected` identity is stabilised. TEDI re-derives the input text from
 *   `selected` whenever its object identity changes; callers almost always pass
 *   `new Date(isoString)` (a fresh object each render), which otherwise reverts
 *   in-progress typing on any unrelated re-render. We keep the same Date object
 *   until its timestamp changes.
 *
 * Known limitation: reformatting moves the caret to the end of the input, so
 * mid-string editing is awkward — fine for the straight-through typing the
 * police workflow relies on.
 */
export function MaskedDateField(props: DateFieldProps) {
  const { selected, ...rest } = props;
  const handleRef = useRef<TextFieldForwardRef | null>(null);

  useEffect(() => {
    const el = handleRef.current?.input as HTMLInputElement | null | undefined;
    if (!el) return;

    const onInput = () => {
      const masked = maskDateInput(el.value);
      if (masked !== el.value) setNativeValue(el, masked);
    };
    const onBlur = () => {
      const completed = completeDateOnBlur(el.value);
      if (completed !== el.value) {
        setNativeValue(el, completed);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    el.addEventListener('input', onInput);
    el.addEventListener('blur', onBlur);
    return () => {
      el.removeEventListener('input', onInput);
      el.removeEventListener('blur', onBlur);
    };
  }, []);

  // Keep the same Date object across unrelated re-renders (callers usually pass
  // `new Date(isoString)`), so a burst of keystrokes isn't reverted mid-typing.
  const selectedKey =
    selected instanceof Date
      ? String(selected.getTime())
      : JSON.stringify(selected ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on selectedKey
  const stableSelected = useMemo(() => selected, [selectedKey]);

  return (
    <DateField {...rest} ref={handleRef} selected={stableSelected} />
  );
}
